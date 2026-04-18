# API

All endpoints are served under the `/api` prefix.

## Health Check

### `GET /api/health`

Checks whether the API and database connection are healthy.

## Courses

### `GET /api/courses`

Returns all courses ordered by `course_name` ascending.

Example:

```bash
curl http://localhost:8080/api/courses
```

Response:

```json
[
  {
    "id": "0195fd6d-bf6d-7df0-a6b5-7dbfbbf58c21",
    "course_name": "CMSC 331",
    "course_id": "CMSC331",
    "professor_name": "Dr. Smith"
  }
]
```

### `POST /api/courses`

Creates a new course.

Request body:

```json
{
  "course_name": "CMSC 331",
  "course_id": "CMSC331",
  "professor_name": "Dr. Smith"
}
```

Example:

```bash
curl -X POST http://localhost:8080/api/courses \
  -H "Content-Type: application/json" \
  -d '{
    "course_name": "CMSC 331",
    "course_id": "CMSC331",
    "professor_name": "Dr. Smith"
  }'
```

Response:

```json
{
  "id": "0195fd6d-bf6d-7df0-a6b5-7dbfbbf58c21",
  "course_name": "CMSC 331",
  "course_id": "CMSC331",
  "professor_name": "Dr. Smith"
}
```

## Syllabi

### `POST /api/courses/:courseID/syllabus/upload`

Uploads or replaces the syllabus PDF for a course.

Rules:

- Only `.pdf` files are accepted.
- The uploaded file must have PDF content.
- Maximum file size is `10MB`.
- `courseID` must be the course UUID from `GET /api/courses`.

Request:

- Content type: `multipart/form-data`
- Form field: `file`

Example:

```bash
COURSE_UUID="<id from GET /api/courses>"

curl -X POST "http://localhost:8080/api/courses/$COURSE_UUID/syllabus/upload" \
  -F "file=@/absolute/path/to/syllabus.pdf;type=application/pdf"
```

Response:

```json
{
  "course_id": "019da206-187b-7daa-a281-00897541b913",
  "original_filename": "syllabus.pdf",
  "content_type": "application/pdf",
  "size_bytes": 460,
  "uploaded_at": "2026-04-18T19:35:07.240401Z"
}
```

### `GET /api/courses/:courseID/syllabus`

Returns metadata for the currently uploaded syllabus PDF.

Example:

```bash
COURSE_UUID="<id from GET /api/courses>"

curl "http://localhost:8080/api/courses/$COURSE_UUID/syllabus"
```

Response:

```json
{
  "course_id": "019da206-187b-7daa-a281-00897541b913",
  "original_filename": "syllabus.pdf",
  "content_type": "application/pdf",
  "size_bytes": 460,
  "uploaded_at": "2026-04-18T19:35:07.240401Z"
}
```

### `GET /api/courses/:courseID/syllabus/download`

Downloads the stored syllabus PDF for a course.

Example:

```bash
COURSE_UUID="<id from GET /api/courses>"

curl -L "http://localhost:8080/api/courses/$COURSE_UUID/syllabus/download" \
  -o /tmp/downloaded-syllabus.pdf
```

### How To Verify Uploading Works

1. Open the app, select a course in the sidebar, and click `Upload Syllabus`.
2. Choose a `.pdf` file. The UI should show the uploaded filename, upload time, and a `Download Current Syllabus` button.
3. Call `GET /api/courses/:courseID/syllabus` and confirm the metadata matches the uploaded file.
4. Call `GET /api/courses/:courseID/syllabus/download` and confirm the downloaded file opens as a PDF.
5. By default, the file is stored under `./uploads/syllabi/<courseID>/syllabus.pdf` relative to the server process working directory.

### Upload Errors

- Invalid file type returns `400 Bad Request`.
- Files larger than `10MB` return `413 Request Entity Too Large`.
- Unknown course IDs return `404 Not Found`.

## Grades

### `GET /api/grades`

Returns paginated grades.

If no query parameters are provided, the API returns the first page of results using:

- `num_rows=50`
- `page_offset=0`

Optional query parameters:

- `course_id`: filters grades to a single course. This accepts either the course UUID or the stored course code such as `CMSC331`.
- `search`: filters by `assignment_name` only
- `num_rows`: page size. Must be greater than `0`
- `page_offset`: zero-based page number. `0` is the first page, `1` is the second page, and so on
- `sort_by`: one of `date`, `assignment`, `grade`
- `sort_dir`: `asc` or `desc`

Default sorting:

- `sort_by=date`
- `sort_dir=desc`

Note:

- `search=CMSC` will not match by course code or course name anymore. It only matches `assignment_name`.
- The sample `curl` commands below were verified against the current local dev database on April 18, 2026.

Examples:

```bash
curl "http://localhost:8080/api/grades?num_rows=10&page_offset=0"
```

```bash
curl "http://localhost:8080/api/grades?course_id=CS101&search=Imported&sort_by=grade&sort_dir=desc"
```

Response:

```json
[
  {
    "id": "019da1c8-a77d-79b8-94f6-395f1c5941bd",
    "course_uuid": "019da1c8-a77d-7596-baf5-54c98eb120fb",
    "assignment_name": "Imported grade",
    "earned": null,
    "total": null,
    "status": "UNGRADED",
    "posted_date": "2026-04-18T14:09:35.099007-04:00"
  }
]
```

### `GET /api/grades/count`

Returns the total number of grade rows that match the optional filters.

Optional query parameters:

- `course_id`: filters grades to a single course. This accepts either the course UUID or the stored course code such as `CMSC331`.
- `search`: filters by `assignment_name` only

Example:

```bash
curl "http://localhost:8080/api/grades/count?course_id=CS101&search=Imported"
```

Response:

```json
3
```

### `POST /api/grades`

Creates a new grade row.

Request body:

```json
{
  "course_uuid": "<course UUID>",
  "assignment_name": "Intro to school or something",
  "earned": 95,
  "total": 100,
  "status": "GRADED",
  "posted_date": "2026-04-18T14:30:00Z"
}
```

Notes:

- `course_uuid` must be a valid UUID.
- `assignment_name` is required.
- `status` must be `GRADED` or `UNGRADED`.
- `earned` and `total` must either both be provided or both be omitted.
- `posted_date` should be an RFC3339 timestamp.

Example:

```bash
COURSE_UUID="<id from POST /api/courses or GET /api/courses>"

curl -X POST http://localhost:8080/api/grades \
  -H "Content-Type: application/json" \
  -d '{
    "course_uuid": "'"$COURSE_UUID"'",
    "assignment_name": "Intro to school or something",
    "earned": 95,
    "total": 100,
    "status": "GRADED",
    "posted_date": "2026-04-18T14:30:00Z"
  }'
```

Response:

```json
{
  "id": "0195fd72-252b-7441-bcb2-0fdc15cbce4b",
  "course_uuid": "<course UUID>",
  "assignment_name": "Intro to school or something",
  "earned": 95,
  "total": 100,
  "status": "GRADED",
  "posted_date": "2026-04-18T14:30:00Z"
}
```

### `PATCH /api/grades/:gradeID`

Updates an existing grade row. Send only the fields you want to change.

Allowed body fields:

- `assignment_name`
- `earned`
- `total`
- `status`
- `posted_date`

Notes:

- At least one field must be provided.
- `status` must be `GRADED` or `UNGRADED`.
- If you include grade points, `earned` and `total` must both be present.
- `posted_date` should be an RFC3339 timestamp.

Example:

```bash
GRADE_ID="<id from POST /api/grades>"

curl -X PATCH http://localhost:8080/api/grades/$GRADE_ID \
  -H "Content-Type: application/json" \
  -d '{
    "assignment_name": "Updated assignment title",
    "earned": 97,
    "total": 100,
    "status": "GRADED"
  }'
```

Response:

```json
{
  "id": "<grade UUID>",
  "course_uuid": "<course UUID>",
  "assignment_name": "Updated assignment title",
  "earned": 97,
  "total": 100,
  "status": "GRADED",
  "posted_date": "2026-04-18T14:30:00Z"
}
```

### `DELETE /api/grades/:gradeID`

Deletes a grade row.

Example:

```bash
GRADE_ID="<id from POST /api/grades>"

curl -X DELETE http://localhost:8080/api/grades/$GRADE_ID
```

Response:

```json
{
  "message": "Grade deleted successfully"
}
```

## Error Responses

Validation and parsing failures return `400 Bad Request`.

Example:

```json
{
  "error": "Invalid request body"
}
```

Server-side failures return `500 Internal Server Error`.
