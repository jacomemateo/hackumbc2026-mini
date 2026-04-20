// background.js — The "brain". Orchestrates tab navigation and message routing.

// ── Constants ─────────────────────────────────────────────────────────────────
const PING_INTERVAL_MS  = 400;
const PING_MAX_ATTEMPTS = 40; // 40 × 400 ms = 16 s max before giving up

// ── State ─────────────────────────────────────────────────────────────────────
// Note: MV3 service workers can be killed between events. These vars are safe
// here because the entire harvest completes within a single continuous session
// (each message keeps the worker alive until the next one arrives).
let courseQueue  = [];
let allGrades    = [];
let totalCourses = 0;

// ── Message Router ────────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, sender) => {

  if (message.action === "START_AUTOMATION") {
    // Reset state for a fresh run
    allGrades    = [];
    courseQueue  = [];
    totalCourses = 0;

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0].id;
      notifyPopup({ status: "navigating", text: "Loading course list…" });
      chrome.tabs.update(tabId, { url: "https://blackboard.umbc.edu/ultra/course" });
      waitForReady(tabId, () => {
        chrome.tabs.sendMessage(tabId, { action: "GET_COURSE_IDS" });
      });
    });
  }

  if (message.action === "IDS_COLLECTED") {
    courseQueue  = message.data;
    totalCourses = courseQueue.length;

    if (totalCourses === 0) {
      notifyPopup({ status: "error", text: "No courses found. Make sure you're logged in to Blackboard." });
      return;
    }

    processNextCourse(sender.tab.id);
  }

 if (message.action === "GRADES_COLLECTED") {
  allGrades.push({ 
    course_id: message.courseId,   // Store separately
    course: message.courseName,    // Now contains just the title
    instructor: message.instructor, 
    grades: message.data 
  });
  processNextCourse(sender.tab.id);
}

  if (message.action === "SCRAPE_ERROR") {
    allGrades.push({ 
      course_id: message.courseId,
      course: message.courseName, 
      instructor: message.instructor, // Store it here too
      grades: [], 
      error: message.error 
    });
    processNextCourse(sender.tab.id);
  }
});

// ── Core Orchestration ────────────────────────────────────────────────────────
function processNextCourse(tabId) {
  if (courseQueue.length === 0) {
    finalize(tabId);
    return;
  }

  const next = courseQueue.shift();
  const completed = totalCourses - courseQueue.length;

  notifyPopup({
    status:  "running",
    text:    `Course ${completed} of ${totalCourses}: ${next.courseId}`, // Show ID in popup
    current: completed,
    total:   totalCourses,
  });

  chrome.tabs.update(tabId, { url: next.URL });
  waitForReady(tabId, () => {
    chrome.tabs.sendMessage(tabId, { 
      action: "SCRAPE_GRADES", 
      courseId: next.courseId,     // NEW: Send ID
      courseName: next.courseName, // NEW: Send Name
      instructor: next.Instructor 
    });
  });
}

async function finalize(tabId) {
  const totalGrades   = allGrades.reduce((sum, c) => sum + c.grades.length, 0);
  const errorCourses  = allGrades.filter(c => c.error).length;

  const harvestRecord = {
    data:        allGrades,
    timestamp:   Date.now(),
    courseCount: allGrades.length,
    gradeCount:  totalGrades,
    errorCount:  errorCourses,
  };

  chrome.storage.local.set({ lastHarvest: harvestRecord });
  let completionText = "Harvest complete. Local JSON downloaded.";

  try {
    await triggerLocalJsonDownload(harvestRecord);
  } catch (error) {
    console.error("Local JSON download failed:", error);
    completionText = "Harvest complete. JSON download failed.";
  }

  notifyPopup({ status: "complete", text: completionText, harvest: harvestRecord });

  try {
    const syncResult = await syncHarvestToDatabase(harvestRecord.data);
    chrome.storage.local.set({
      lastHarvest: {
        ...harvestRecord,
        databaseSynced: true,
        syncSummary: syncResult,
      },
    });
    notifyDatabaseSyncSuccess(syncResult);
  } catch (error) {
    console.error("Database sync failed:", error);
    chrome.storage.local.set({
      lastHarvest: {
        ...harvestRecord,
        databaseSynced: false,
        syncError: error.message,
      },
    });
    notifyPopup({
      status: "error",
      text: `Harvest saved locally, but database sync failed: ${error.message}`,
      harvest: harvestRecord,
    });
  }
}

function triggerLocalJsonDownload(harvestRecord) {
  return new Promise((resolve, reject) => {
    const json = JSON.stringify(harvestRecord.data, null, 2);
    const url = `data:application/json;charset=utf-8,${encodeURIComponent(json)}`;

    chrome.downloads.download({
      url,
      filename: `BB_Grades_${formatDateFile(harvestRecord.timestamp)}.json`,
      saveAs: false,
    }, (downloadId) => {
      const lastError = chrome.runtime.lastError;

      if (lastError) {
        reject(new Error(lastError.message));
        return;
      }

      resolve(downloadId);
    });
  });
}

async function syncHarvestToDatabase(gradesPayload) {
  const response = await fetch("http://localhost:8080/api/harvest", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(gradesPayload),
  });

  const contentType = response.headers.get("content-type") ?? "";
  const responseBody = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const errorMessage =
      typeof responseBody === "object" && responseBody?.error
        ? responseBody.error
        : responseBody || `HTTP ${response.status}`;
    throw new Error(`HTTP ${response.status}: ${errorMessage}`);
  }

  return responseBody;
}

// ── Page-Ready Detection ──────────────────────────────────────────────────────
// Replaces brittle hardcoded setTimeout. Waits for the tab to finish loading,
// then pings the content script until it confirms the SPA has rendered.

function waitForReady(tabId, callback) {
  // Use a named listener so we can remove exactly this one and never stack.
  function onUpdated(tId, info) {
    if (tId !== tabId || info.status !== "complete") return;
    chrome.tabs.onUpdated.removeListener(onUpdated);
    pingUntilReady(tabId, callback);
  }
  chrome.tabs.onUpdated.addListener(onUpdated);
}

function pingUntilReady(tabId, callback, attempts = 0) {
  if (attempts >= PING_MAX_ATTEMPTS) {
    notifyPopup({ status: "error", text: "A page took too long to load. Please try again." });
    return;
  }

  chrome.tabs.sendMessage(tabId, { action: "PING" }, (response) => {
    if (chrome.runtime.lastError || !response?.ready) {
      setTimeout(() => pingUntilReady(tabId, callback, attempts + 1), PING_INTERVAL_MS);
    } else {
      callback();
    }
  });
}

// ── Popup Notifications ───────────────────────────────────────────────────────
// Sends live updates to the popup. Silently swallows errors when popup is closed.
function notifyPopup(payload) {
  chrome.runtime.sendMessage({ action: "POPUP_UPDATE", ...payload }, () => {
    void chrome.runtime.lastError; // Suppress "no receiving end" console error
  });
}

function notifyDatabaseSyncSuccess(syncResult) {
  chrome.runtime.sendMessage({
    action: "DATABASE_SYNC_SUCCESS",
    text: "Database Populated",
    syncResult,
  }, () => {
    void chrome.runtime.lastError;
  });
}

function formatDateFile(ts) {
  return new Date(ts).toISOString().slice(0, 10);
}
