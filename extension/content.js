// content.js — Runs inside Blackboard tabs. Scrapes data and reports back.

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  // ── Smart Page Readiness ──────────────────────────────────────────────────
  if (message.action === "PING") {
    const url = window.location.href;
    const isCourseListPage = url.includes("/ultra/course") && !url.includes("/grades");
    
    let ready = false;
    if (isCourseListPage) {
      // On Course List: Wait for cards AND instructor names to load
      const cards = document.querySelectorAll(BB_MAP.courseList.itemCard);
      const instructors = document.querySelectorAll(BB_MAP.courseList.instructor);
      ready = cards.length > 0 && instructors.length > 0;
    } else {
      // On Grade pages: Just wait for the table rows to appear
      ready = document.querySelectorAll(BB_MAP.gradeTable.rows).length > 0;
    }

    sendResponse({ ready });
    return true; 
  }

  // ── Course ID Collection with Regex Split ─────────────────────────────────
  if (message.action === "GET_COURSE_IDS") {
    const courseElements = document.querySelectorAll(BB_MAP.courseList.itemCard);
    const ids = Array.from(courseElements)
      .filter(card => {
        const statusEl = card.querySelector(".status-text");
        const statusText = statusEl?.innerText.trim().toLowerCase();
        return statusText === BB_MAP.courseList.couseStatusOpen;
      })
      .map(card => {
        const rawName = card.querySelector(BB_MAP.courseList.courseName)?.innerText.trim() ?? "Unknown Course";
        const url = `https://blackboard.umbc.edu/ultra/courses/${card.getAttribute(BB_MAP.courseList.courseIdAttr)}/grades`;
        
        // Split logic: Course ID (first 2 words) and Title (until first "(")
        const words = rawName.split(' ');
        const courseId = words.slice(0, 2).join(' ');
        const remaining = words.slice(2).join(' ');
        const courseTitle = remaining.split('(')[0].trim() || rawName;

        const instructorEl = card.querySelector(BB_MAP.courseList.instructor);
        let instructorName = "Unknown Instructor";
        if (instructorEl) {
          const nameNode = instructorEl.querySelector('bdi') || instructorEl;
          instructorName = nameNode.innerText.trim();
        }

        return { courseId, courseName: courseTitle, Instructor: instructorName, URL: url };
      });
    chrome.runtime.sendMessage({ action: "IDS_COLLECTED", data: ids });
  }

  // ── Scrape grades for one course ──────────────────────────────────────────
  if (message.action === "SCRAPE_GRADES") {
    // FIX: Pass all three arguments correctly
    handleMultiPageScrape(message.courseId, message.courseName, message.instructor);
  }
});

// ── Pagination-aware scraper ──────────────────────────────────────────────────
async function handleMultiPageScrape(courseId, courseName, instructor) { // FIX: Added courseId parameter
  try {
    let allPagesData = [];
    let hasNextPage  = true;

    while (hasNextPage) {
      const rows = document.querySelectorAll(BB_MAP.gradeTable.rows);
      const pageData = Array.from(rows).map(parseRow);
      allPagesData = allPagesData.concat(pageData);

      const nextBtn = document.querySelector(BB_MAP.gradeTable.nextPageBtn);
      if (nextBtn && !nextBtn.hasAttribute("disabled")) {
        const firstRowSnapshot = document.querySelector(BB_MAP.gradeTable.rows)?.textContent ?? "";
        nextBtn.click();
        await waitForTableChange(firstRowSnapshot);
      } else {
        hasNextPage = false;
      }
    }

    // Report results back to background.js
    chrome.runtime.sendMessage({
      action:     "GRADES_COLLECTED",
      courseId:   courseId,   // Now correctly defined
      courseName: courseName,
      instructor: instructor,
      data:       allPagesData,
    });
  } catch (err) {
    chrome.runtime.sendMessage({
      action:     "SCRAPE_ERROR",
      courseId:   courseId,
      courseName: courseName,
      instructor: instructor,
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
      const earnedValue = parseFloat(score);
      const totalValue = parseFloat(total);

      if (
        Number.isFinite(earnedValue) &&
        Number.isFinite(totalValue) &&
        totalValue > 0 &&
        earnedValue >= 0
      ) {
        grade = {
          earned: earnedValue,
          total: totalValue,
        };
      }
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
