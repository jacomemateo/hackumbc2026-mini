// map.js — Shared selectors and config for all scripts.
// Centralizing selectors here means a Blackboard UI update only ever
// requires a change in one place.

const BB_MAP = {
  // ── Course List Page (/ultra/course) ─────────────────────────────────────
  courseList: {
    itemCard:    'article[data-course-id]',
    courseName:  'h4',
    courseIdAttr: 'data-course-id',
    couseStatusOpen: 'open',
    instructor:  '.instructors bb-username, .instructors .multi-users-title'
  },

  // ── Grade Table Page (/ultra/courses/:id/grades) ──────────────────────────
  gradeTable: {
    rows:           'tbody tr',
    assignmentName: '[aria-describedby*="header-itemName"]',
    dueDate:        '[aria-describedby*="header-dueDate"]',
    status:         '[aria-describedby*="header-status"]',
    gradeCell:      '[aria-describedby*="header-grade"]',
    // Elements inside the grade cell
    gradePill:      '.js-pill-grade',
    totalPoints:    '.pill-points-possible',
    screenReaderLabel: '.sr-only',
    // Pagination
    nextPageBtn:        '.js-pagination-page-up-button',
    paginationContainer: '.js-pagination-container',
  },

  // ── String constants ───────────────────────────────────────────────────────
  strings: {
    contentRestricted: "(Content isn't available)",
    defaultGrade: "Not Graded",
  },
};

// ── Timing / retry config (used by content.js) ──────────────────────────────
// Keep all magic numbers here so they're easy to tune.
const BB_CONFIG = {
  // How long to wait for a MutationObserver-based update before giving up
  PAGINATION_TIMEOUT_MS: 5000,
  // Ping interval when polling for page readiness (background uses its own copy)
  PING_INTERVAL_MS: 400,
  PING_MAX_ATTEMPTS: 40, // 40 × 400 ms = 16 s max wait
};