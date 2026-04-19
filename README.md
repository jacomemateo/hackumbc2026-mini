# Grade Harvester

**Grade Harvester** is a full-stack academic grade tracking tool built for HackUMBC 2026. It automates the tedious process of collecting grades from UMBC's Blackboard LMS, stores them in a structured database, and uses Google's Gemini AI to intelligently map assignments to syllabus grading categories — so students can see a real-time weighted GPA estimate without manually entering anything.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [System Architecture](#system-architecture)
3. [Component Breakdown](#component-breakdown)
   - [Chrome Extension](#chrome-extension)
   - [Go Backend Server](#go-backend-server)
   - [PostgreSQL Database](#postgresql-database)
   - [React Web Frontend](#react-web-frontend)
4. [The Data Pipeline](#the-data-pipeline)
   - [Stage 1: Grade Harvesting (Extension → Server)](#stage-1-grade-harvesting)
   - [Stage 2: Syllabus Parsing (PDF → AI → Categories)](#stage-2-syllabus-parsing)
   - [Stage 3: AI Reconciliation (Assignments → Categories)](#stage-3-ai-reconciliation)
   - [Stage 4: Grade Display & Calculation (Frontend)](#stage-4-grade-display--calculation)
5. [API Reference](#api-reference)
6. [Tech Stack](#tech-stack)
7. [Local Development Setup](#local-development-setup)
8. [Environment Variables](#environment-variables)
9. [Project Structure](#project-structure)

---

## Project Overview

Students at UMBC (and many other universities) access grades through Blackboard Ultra — a clunky LMS that shows raw scores per assignment but provides no weighted grade calculation tied to the actual syllabus. Grade Harvester solves this in three steps:

1. A **Chrome extension** automatically navigates Blackboard, scrapes every assignment grade across all enrolled courses, and ships the data to a local server.
2. A **Go backend** stores those grades in PostgreSQL and exposes a REST API. When a student uploads their course syllabus PDF, the server calls **Gemini AI** (via Google Vertex AI) to extract the grading category breakdown (e.g., "Homework 30%, Midterm 25%, Final 45%").
3. Gemini is called a second time to match each scraped assignment to its correct category. The **React web frontend** then computes a live weighted grade estimate for each course.

---

## System Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        Student's Browser                         │
│                                                                  │
│  ┌─────────────────────────┐    ┌──────────────────────────────┐ │
│  │   Chrome Extension      │    │     React Web App            │ │
│  │                         │    │   (localhost:5173)           │ │
│  │  popup.js               │    │                              │ │
│  │  background.js  ──────────────────────────────────────────► │ │
│  │  content.js             │    │  CourseGradesOverview        │ │
│  │  map.js                 │    │  CourseGradeBadge            │ │
│  │                         │    │  DisplayGrades               │ │
│  │  [Scrapes Blackboard]   │    │  useSyllabusUpload           │ │
│  └────────────┬────────────┘    └──────────────┬───────────────┘ │
│               │ POST /api/harvest              │ REST API calls   │
└───────────────┼────────────────────────────────┼─────────────────┘
                │                                │
                ▼                                ▼
┌──────────────────────────────────────────────────────────────────┐
│                  Go Backend (localhost:8080)                      │
│                                                                  │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │  Transport  │  │   Service    │  │     Repository       │   │
│  │  (HTTP)     │  │   Layer      │  │  (sqlc-generated)    │   │
│  │             │  │              │  │                      │   │
│  │  Handlers   │─►│  Harvest     │  │  GetCourseByID       │   │
│  │  DTOs       │  │  Syllabus    │─►│  CreateGrade         │   │
│  │  Router     │  │  Reconciler  │  │  GetGrades           │   │
│  │             │  │  Gemini      │  │  UpdateGradeCategory │   │
│  └─────────────┘  └──────┬───────┘  └──────────┬───────────┘   │
│                          │                      │               │
└──────────────────────────┼──────────────────────┼───────────────┘
                           │                      │
              ┌────────────┘                      │
              ▼                                   ▼
┌─────────────────────────┐           ┌───────────────────────────┐
│  Google Vertex AI       │           │  PostgreSQL Database       │
│  (Gemini 2.5 Pro)       │           │                           │
│                         │           │  courses                  │
│  ExtractCategories      │           │  grades                   │
│  MatchAssignments       │           │  categories               │
└─────────────────────────┘           └───────────────────────────┘
```

---

## Component Breakdown

### Chrome Extension

Located in `extension/`, this is a Manifest V3 Chrome extension with three collaborating scripts.

**`manifest.json`** declares the extension's permissions: `tabs`, `activeTab`, `downloads`, `storage`, and `scripting` — everything needed to navigate pages, extract DOM content, download files, and communicate between scripts.

**`background.js`** — the orchestration brain. It runs as a service worker and manages the entire scraping session as a state machine:

- Listens for a `START_AUTOMATION` message from the popup.
- Navigates the tab to `blackboard.umbc.edu/ultra/course` and waits for it to fully render (using a polling ping-based readiness check rather than fragile `setTimeout`s).
- Sends a `GET_COURSE_IDS` message to the content script and receives back an array of course URLs and metadata.
- Works through a `courseQueue`, navigating to each course's grades page one at a time, collecting `GRADES_COLLECTED` responses.
- After all courses are processed, calls `finalize()`: saves a local JSON snapshot via `chrome.downloads`, then POSTs the entire payload to `POST /api/harvest` on the local server.

**`content.js`** — the DOM scraper. It runs inside the Blackboard tab and knows how to:

- Read `article[data-course-id]` elements on the course list page to build the queue.
- Scrape the grades table on each course's grades page, handling pagination via `MutationObserver` to detect when the next page loads.
- Extract assignment name, due date, status (`Graded` / `Not Graded`), earned points, and total points from each row.

**`map.js`** — a shared configuration file containing all CSS selectors and timing constants. This is the single source of truth for Blackboard's DOM structure, so a Blackboard UI change only requires editing one file.

**`popup.html` / `popup.js`** — the extension's UI. It shows a button to start the harvest and displays live progress (e.g., "Course 3 of 7: CMSC331") as well as a database sync confirmation when the server import completes.

---

### Go Backend Server

Located in `server/`, the backend is a clean layered Go application.

#### Layer Structure

```
cmd/api/main.go          — Entry point: wires dependencies, starts HTTP server
internal/
  repository/            — Database access (sqlc-generated from SQL queries)
  service/               — Business logic
    harvest_service.go   — Imports bulk grade data from the extension
    syllabus_service.go  — Handles PDF upload, calls Gemini, stores categories
    gemini_service.go    — Vertex AI client for two AI tasks
    reconciler_service.go — Matches grades to categories via Gemini
    course_service.go    — CRUD for courses
    grade_service.go     — CRUD for grades with filtering/pagination
    category_service.go  — CRUD for grading categories
  transport/http/
    handlers/            — HTTP request handlers (one file per resource)
    dto/                 — Request/response structs
    router.go            — Route registration
  validation/            — Input validation helpers
```

#### Key Services

**`HarvestService`** receives the bulk payload from the Chrome extension. For each course in the payload, it upserts the course record (create if new, update if name/professor changed), wipes the existing grades (treating each harvest as the latest snapshot), re-inserts all grades, and then triggers reconciliation — all within a single database transaction.

**`SyllabusService`** handles PDF uploads. It validates the file (PDF only, max 10 MB), writes it to disk at `./uploads/syllabi/<courseID>/syllabus.pdf`, then calls Gemini to extract grading categories. If extraction succeeds, it replaces all existing categories for the course and triggers reconciliation. Metadata (filename, size, parse status) is stored as a JSON sidecar file.

**`GeminiService`** is the Vertex AI client. It exposes two methods:
- `ExtractCategoriesFromPDF`: sends the PDF bytes to Gemini 2.5 Pro with a structured prompt requesting JSON output in the schema `{"categories":[{"name":"...","weight":10.5}]}`.
- `MatchAssignmentsToCategories`: sends assignment names and available categories, asking Gemini to return a mapping of `assignment_id → category_id` (or `null` if no match).

Both calls use `ResponseMIMEType: "application/json"` and a `ResponseJsonSchema` to enforce structured output at zero temperature.

**`ReconcilerService`** is called after any grade import or category change. It loads the course's grades and categories, builds input arrays, calls `GeminiService.MatchAssignmentsToCategories`, and updates each grade's `category_id` in the database.

---

### PostgreSQL Database

Schema is managed via raw SQL migrations (`db/migrations/`) and queries are compiled to type-safe Go code by [sqlc](https://sqlc.dev) (`sqlc.yaml`).

**`courses`** — stores each enrolled course with a UUID primary key, a `course_name` (e.g., "CMSC 331"), a `course_id` code (e.g., "CMSC331"), and `professor_name`.

**`grades`** — stores individual assignment records. Each row has a `course_uuid` foreign key, `assignment_name`, optional `earned` and `total` float columns, a `status` enum (`GRADED` / `UNGRADED`), `posted_date`, and a nullable `category_id` foreign key that gets populated by the reconciler.

**`categories`** — stores grading categories extracted from a syllabus. Each row belongs to a course and has a `category_name` and a `weight` (numeric percentage, e.g., `30.0`).

---

### React Web Frontend

Located in `web/`, it's a Vite + React + TypeScript app styled with Material UI.

**`Template.tsx`** is the root layout — it renders the sidebar (course list) and the main content area.

**`CourseGradesOverview.tsx`** maps over all courses and renders a `CourseGradeCard` for each.

**`CourseGradeCard`** uses the `useCourseGrades` hook to fetch a course's grades and categories from the API, then renders a `CourseGradeBadge` (showing the weighted percentage) and a `GradesGrid` (showing the full assignments table with filtering, sorting, and pagination).

**`courseGradeSummary.ts`** contains the core grade calculation logic. For each graded assignment that has a category and non-zero total:
1. It accumulates earned/total points per category.
2. It computes a weighted contribution: `(earned / total) * weight`.
3. It sums contributions and divides by the sum of tracked weights to produce a percentage.

This means the percentage shown is always relative to the portion of the syllabus weight that has been graded — not a naive average of raw scores.

**`useSyllabusUpload.tsx`** provides a hook for uploading a PDF syllabus for a selected course, showing upload state and parse status feedback.

---

## The Data Pipeline

### Stage 1: Grade Harvesting

```
Blackboard Ultra (browser)
  └─► content.js scrapes course list → GET_COURSE_IDS
        └─► background.js queues each course URL
              └─► content.js scrapes grades page (with pagination)
                    └─► GRADES_COLLECTED sent back to background.js
                          └─► finalize():
                                ├─► Download local JSON snapshot
                                └─► POST /api/harvest → HarvestService
                                      ├─► Upsert course record
                                      ├─► DELETE existing grades for course
                                      ├─► INSERT all new grades
                                      └─► Trigger reconciliation (if categories exist)
```

Each harvest is treated as a complete replacement for a course's grades — there's no diffing or merging. This keeps things simple and ensures the database always reflects the current state of Blackboard.

### Stage 2: Syllabus Parsing

```
User uploads syllabus PDF via web UI
  └─► POST /api/courses/:courseID/syllabus/upload
        └─► SyllabusService.UploadSyllabus()
              ├─► Validate: PDF only, ≤ 10MB
              ├─► Write PDF to disk
              ├─► GeminiService.ExtractCategoriesFromPDF()
              │     └─► Vertex AI (Gemini 2.5 Pro)
              │           ├─► Input: PDF bytes + structured prompt
              │           └─► Output: [{"name":"Homework","weight":30}, ...]
              ├─► DELETE existing categories for course
              ├─► INSERT new categories
              └─► ReconcilerService.reconcileCourseInQueries()
                    └─► [see Stage 3]
```

The Gemini prompt is carefully written to ignore grading scales, attendance policies, and bonus rules — extracting only the weighted category breakdown.

### Stage 3: AI Reconciliation

```
ReconcilerService triggered after harvest or syllabus upload
  └─► Load course's categories from DB
  └─► Load course's grades from DB
  └─► GeminiService.MatchAssignmentsToCategories()
        ├─► Input: [{id, name}, ...] assignments
        │          [{id, name, weight}, ...] categories
        └─► Output: [{assignment_id, category_id | null}, ...]
  └─► For each match: UPDATE grades SET category_id = ? WHERE id = ?
```

Gemini is given real database UUIDs for both assignments and categories. The response is validated — the server rejects any returned IDs that weren't in the original input, preventing hallucinated or fabricated IDs from corrupting data.

### Stage 4: Grade Display & Calculation

```
React web app loads
  └─► GET /api/courses → course list
  └─► For each course:
        ├─► GET /api/grades?course_id=<uuid>  → assignment rows
        └─► GET /api/categories?course_id=<uuid> → category weights
              └─► calculateCourseGradeSummary()
                    ├─► Group graded assignments by category_id
                    ├─► Per category: sum earned / sum total * weight
                    └─► Overall: sum(weighted contributions) / sum(tracked weights) * 100
                          └─► Displayed as CourseGradeBadge (e.g., "87.4%")
```

---

## API Reference

All routes are served under `/api`. See `API.md` for full request/response examples.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/courses` | List all courses |
| `POST` | `/api/courses` | Create a course |
| `POST` | `/api/harvest` | Bulk import grades from extension |
| `POST` | `/api/courses/:id/syllabus/upload` | Upload syllabus PDF |
| `GET` | `/api/courses/:id/syllabus` | Get syllabus metadata |
| `GET` | `/api/courses/:id/syllabus/download` | Download syllabus PDF |
| `GET` | `/api/grades` | List grades (paginated, filterable) |
| `GET` | `/api/grades/count` | Count matching grades |
| `POST` | `/api/grades` | Create a grade |
| `PATCH` | `/api/grades/:id` | Update a grade |
| `DELETE` | `/api/grades/:id` | Delete a grade |
| `GET` | `/api/categories` | List categories |
| `POST` | `/api/categories` | Create a category |
| `DELETE` | `/api/categories/:id` | Delete a category |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Extension | Chrome MV3, vanilla JS |
| Backend | Go, Chi router, pgx (PostgreSQL driver) |
| Database | PostgreSQL |
| ORM / Query gen | sqlc |
| AI | Google Vertex AI (Gemini 2.5 Pro) via `google.golang.org/genai` |
| Frontend | React 18, TypeScript, Vite, Material UI |
| Dev tooling | Task (Taskfile), Air (hot reload), Docker Compose |

---

## Local Development Setup

### Prerequisites

- Go 1.22+
- Node.js 20+
- Docker & Docker Compose
- A Google Cloud project with Vertex AI enabled and Application Default Credentials configured

### 1. Start the database

```bash
docker-compose up -d
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env — at minimum set VERTEX_AI_PROJECT and VERTEX_AI_LOCATION
```

### 3. Run the server

```bash
task server         # or: go run ./server/cmd/api
# With hot reload:
air
```

### 4. Run the web frontend

```bash
cd web
npm install
npm run dev
# Opens at http://localhost:5173
```

### 5. Load the Chrome extension

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** and select the `extension/` directory

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | — |
| `VERTEX_AI_PROJECT` | Google Cloud project ID | — |
| `VERTEX_AI_LOCATION` | Vertex AI region (e.g. `us-central1`) | — |
| `VERTEX_AI_MODEL` | Gemini model to use | `gemini-2.5-pro` |
| `SYLLABUS_UPLOAD_DIR` | Directory for uploaded PDFs | `./uploads/syllabi` |
| `PORT` | HTTP server port | `8080` |

---

## Project Structure

```
.
├── extension/          # Chrome MV3 extension
│   ├── background.js   # Orchestration service worker
│   ├── content.js      # DOM scraper (runs in Blackboard tab)
│   ├── map.js          # Shared CSS selectors & timing config
│   ├── popup.html/js   # Extension UI
│   └── manifest.json
│
├── server/             # Go backend
│   ├── cmd/api/        # Entry point & config
│   └── internal/
│       ├── repository/ # sqlc-generated DB access layer
│       ├── service/    # Business logic (harvest, syllabus, gemini, reconciler)
│       └── transport/  # HTTP handlers, DTOs, router
│
├── web/                # React + TypeScript frontend
│   └── src/
│       ├── components/ # CourseGradesOverview, GradeBadge, DisplayGrades
│       ├── hooks/      # useSyllabusUpload
│       └── services/   # API client
│
├── db/
│   ├── migrations/     # SQL schema migrations
│   ├── queries/        # sqlc source queries
│   └── seeds/          # Dev seed data
│
├── docker-compose.yml  # PostgreSQL container
├── sqlc.yaml           # sqlc code generation config
├── Taskfile.yml        # Task runner shortcuts
└── API.md              # Full API documentation
```

---
