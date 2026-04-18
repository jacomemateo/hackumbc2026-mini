// content.js — Runs inside Blackboard tabs. Scrapes data and reports back.
// BB_MAP and BB_CONFIG are injected before this script by manifest.json (map.js).

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  // ── Readiness ping from background ────────────────────────────────────────
  // background.js polls this to know when the SPA has actually rendered content,
  // replacing the old hardcoded 4-second setTimeout.
  if (message.action === "PING") {
    const courseListReady = document.querySelectorAll(BB_MAP.courseList.itemCard).length > 0;
    const gradePageReady  = document.querySelectorAll(BB_MAP.gradeTable.rows).length > 0;
    sendResponse({ ready: courseListReady || gradePageReady });
    return true; // Keep the message channel open for async sendResponse
  }

  // ── Collect course IDs from the course list page ───────────────────────────
  if (message.action === "GET_COURSE_IDS") {
  const courseElements = document.querySelectorAll(BB_MAP.courseList.itemCard);

  const ids = Array.from(courseElements)
    .filter(card => {
      const statusEl = card.querySelector(".status-text");
      const statusText = statusEl?.innerText.trim().toLowerCase();

      // include ONLY open courses
      return statusText === BB_MAP.courseList.couseStatusOpen;
    })
    .map(card => ({
      Name: card.querySelector(BB_MAP.courseList.courseName)?.innerText.trim() ?? "Unknown Course",
      URL: `https://blackboard.umbc.edu/ultra/courses/${card.getAttribute(BB_MAP.courseList.courseIdAttr)}/grades`,
    }));

  chrome.runtime.sendMessage({ action: "IDS_COLLECTED", data: ids });
}

  // ── Scrape grades for one course (with pagination) ─────────────────────────
  if (message.action === "SCRAPE_GRADES") {
    handleMultiPageScrape(message.courseName);
  }
});

// ── Pagination-aware scraper ──────────────────────────────────────────────────
async function handleMultiPageScrape(courseName) {
  try {
    let allPagesData = [];
    let hasNextPage  = true;

    while (hasNextPage) {
      // 1. Scrape every visible row on the current page.
      const rows    = document.querySelectorAll(BB_MAP.gradeTable.rows);
      const pageData = Array.from(rows).map(parseRow);
      allPagesData  = allPagesData.concat(pageData);

      // 2. Advance to next page if one exists and isn't disabled.
      const nextBtn = document.querySelector(BB_MAP.gradeTable.nextPageBtn);
      if (nextBtn && !nextBtn.hasAttribute("disabled")) {
        // Snapshot the current first row's text so we can detect when
        // the DOM has actually updated (replaces the old 2-second timeout).
        const firstRowSnapshot = document.querySelector(BB_MAP.gradeTable.rows)?.textContent ?? "";
        nextBtn.click();
        await waitForTableChange(firstRowSnapshot);
      } else {
        hasNextPage = false;
      }
    }

    chrome.runtime.sendMessage({
      action:     "GRADES_COLLECTED",
      courseName: courseName,
      data:       allPagesData,
    });

  } catch (err) {
    // Report the error back so background.js can skip this course gracefully
    // rather than freezing the entire queue.
    chrome.runtime.sendMessage({
      action:     "SCRAPE_ERROR",
      courseName: courseName,
      error:      err.message,
    });
  }
}

// ── Row Parser ────────────────────────────────────────────────────────────────
function parseRow(row) {
  const nameEl = row.querySelector(BB_MAP.gradeTable.assignmentName);
  const name   = nameEl
    ? nameEl.innerText.replace(BB_MAP.strings.contentRestricted, "").trim()
    : "Unknown";

  const date   = row.querySelector(BB_MAP.gradeTable.dueDate)?.innerText.trim()  || "None";

  const gradeCell = row.querySelector(BB_MAP.gradeTable.gradeCell);
  let grade = { earned: null, total: null };
  
  if (gradeCell) {
    const score = gradeCell.querySelector(BB_MAP.gradeTable.gradePill)?.innerText.trim();
    const total = gradeCell.querySelector(BB_MAP.gradeTable.totalPoints)?.innerText.trim();
    
    if (score && total) {
      grade = {
        earned: parseFloat(score),
        total: parseFloat(total)
      };
    }
  }

  // Status is "Graded" if both earned and total exist, otherwise "Not Graded"
  const status = (grade.earned !== null && grade.total !== null) ? "Graded" : "Not Graded";

  return { Assignment: name, Date: date, Status: status, Grade: grade };
}

// ── Smart Pagination Wait ─────────────────────────────────────────────────────
// Uses a MutationObserver to detect when Blackboard's React table actually
// re-renders after a page turn. Falls back to a timeout if the DOM never changes.
function waitForTableChange(previousFirstRowText) {
  return new Promise((resolve) => {
    const fallback = setTimeout(resolve, BB_CONFIG.PAGINATION_TIMEOUT_MS);

    const observer = new MutationObserver(() => {
      const current = document.querySelector(BB_MAP.gradeTable.rows);
      if (current && current.textContent !== previousFirstRowText) {
        clearTimeout(fallback);
        observer.disconnect();
        resolve();
      }
    });

    const tbody = document.querySelector("tbody");
    if (tbody) {
      observer.observe(tbody, { childList: true, subtree: true, characterData: true });
    } else {
      // No tbody found — nothing to observe, resolve immediately.
      clearTimeout(fallback);
      resolve();
    }
  });
}