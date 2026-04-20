// popup.js — Manages the popup UI. Receives live updates from background.js.

// ── DOM refs ──────────────────────────────────────────────────────────────────
const startBtn      = document.getElementById("start-btn");
const progressWrap  = document.getElementById("progress-wrap");
const progressFill  = document.getElementById("progress-fill");
const progressLabel = document.getElementById("progress-label");
const statusCard    = document.getElementById("status-card");
const statusIcon    = document.getElementById("status-icon");
const statusText    = document.getElementById("status-text");
const exportWrap    = document.getElementById("export-wrap");
const harvestMeta   = document.getElementById("harvest-meta");

// ── On open: restore state from storage ──────────────────────────────────────
chrome.storage.local.get(["lastHarvest"], ({ lastHarvest }) => {
  if (lastHarvest) {
    renderExportSection(lastHarvest);
    const timeStr = formatDate(lastHarvest.timestamp);
    if (lastHarvest.databaseSynced) {
      setStatus("complete", `Database Populated · Last harvest: ${timeStr}`);
    } else if (lastHarvest.syncError) {
      setStatus("error", `Local harvest saved · Sync failed: ${lastHarvest.syncError}`);
    } else {
      setStatus("ready", `Last harvest: ${timeStr}`);
    }
  }
});

// ── Live updates from background.js ──────────────────────────────────────────
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "DATABASE_SYNC_SUCCESS") {
    setStatus("complete", message.text || "Database Populated");
    return;
  }

  if (message.action !== "POPUP_UPDATE") return;

  switch (message.status) {
    case "navigating":
      setStatus("running", message.text);
      break;

    case "running":
      setStatus("running", message.text);
      showProgress(message.current, message.total);
      break;

    case "complete":
      setStatus("complete", message.text);
      hideProgress();
      startBtn.disabled = false;
      startBtn.textContent = "↺  Start New Harvest";
      if (message.harvest) renderExportSection(message.harvest);
      break;

    case "error":
      setStatus("error", message.text);
      if (message.harvest) renderExportSection(message.harvest);
      hideProgress();
      startBtn.disabled = false;
      startBtn.textContent = "↺  Retry Harvest";
      break;
  }
});

// ── Start button ──────────────────────────────────────────────────────────────
startBtn.addEventListener("click", () => {
  startBtn.disabled = true;
  startBtn.textContent = "⏳  Running…";
  exportWrap.classList.add("hidden");
  setStatus("running", "Starting up…");
  chrome.runtime.sendMessage({ action: "START_AUTOMATION" });
});

// ── Export: Excel ─────────────────────────────────────────────────────────────
document.getElementById("export-excel-btn").addEventListener("click", () => {
  chrome.storage.local.get(["lastHarvest"], ({ lastHarvest }) => {
    if (!lastHarvest?.data?.length) return;

    const wb = XLSX.utils.book_new();

    // ── One sheet per course ──────────────────────────────────────────────────
    lastHarvest.data.forEach(({ course, grades }) => {
      if (!grades?.length) return;
      const ws      = XLSX.utils.json_to_sheet(grades);
      const safeName = course.substring(0, 30).replace(/[\\*?:/[\]]/g, "").trim() || "Course";
      XLSX.utils.book_append_sheet(wb, ws, safeName);
    });

    XLSX.writeFile(wb, `BB_Grades_${formatDateFile(lastHarvest.timestamp)}.xlsx`);
  });
});

// ── Export: JSON ──────────────────────────────────────────────────────────────
document.getElementById("export-json-btn").addEventListener("click", () => {
  chrome.storage.local.get(["lastHarvest"], ({ lastHarvest }) => {
    if (!lastHarvest) return;

    const blob = new Blob(
      [JSON.stringify(lastHarvest.data, null, 2)],
      { type: "application/json" }
    );
    const url  = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href     = url;
    link.download = `BB_Grades_${formatDateFile(lastHarvest.timestamp)}.json`;
    link.click();
    URL.revokeObjectURL(url); // Free memory immediately after triggering download
  });
});

// ── UI helpers ────────────────────────────────────────────────────────────────

const STATUS_STYLES = {
  ready:      { icon: "⏳", color: "#9099a8" },
  running:    { icon: "⚙️",  color: "#3b5998" },
  complete:   { icon: "✅", color: "#1e8c45" },
  error:      { icon: "⚠️",  color: "#c0392b" },
};

function setStatus(type, text) {
  const s = STATUS_STYLES[type] ?? STATUS_STYLES.ready;
  statusIcon.textContent         = s.icon;
  statusText.textContent         = text;
  statusCard.style.borderLeftColor = s.color;
}

function showProgress(current, total) {
  progressWrap.classList.remove("hidden");
  const pct = Math.min(Math.round((current / total) * 100), 100);
  progressFill.style.width    = `${pct}%`;
  progressLabel.textContent   = `${current} of ${total} courses`;
}

function hideProgress() {
  progressWrap.classList.add("hidden");
}

function renderExportSection(harvest) {
  exportWrap.classList.remove("hidden");
  const errors = harvest.errorCount > 0 ? ` · ${harvest.errorCount} error(s)` : "";
  harvestMeta.innerHTML =
    `<strong>${harvest.courseCount}</strong> courses &nbsp;·&nbsp; ` +
    `<strong>${harvest.gradeCount}</strong> grades` +
    `${errors}<br><span style="color:#b0b8c4">${formatDate(harvest.timestamp)}</span>`;
}

function formatDate(ts) {
  return new Date(ts).toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
}

function formatDateFile(ts) {
  // YYYY-MM-DD for filenames
  return new Date(ts).toISOString().slice(0, 10);
}
