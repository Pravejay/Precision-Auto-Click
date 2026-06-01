(function () {
  // Prevent duplicate injections
  if (window.hasOwnProperty("__pac_initialized")) {
    return;
  }
  window.__pac_initialized = true;

  let lastRightClickedElement = null;
  let targetElement = null;
  let targetTime = null; // unix timestamp in ms
  let isScheduled = false;
  let preciseTimerId = null;
  let uiUpdateInterval = null;

  // Track right-clicked elements
  document.addEventListener("contextmenu", (event) => {
    lastRightClickedElement = event.target;
  });

  // Listen to background messages
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "openScheduler") {
      if (lastRightClickedElement) {
        targetElement = lastRightClickedElement;
        showSchedulerPanel();
        sendResponse({ success: true });
      } else {
        alert("Please right-click on the element you want to target.");
        sendResponse({ success: false });
      }
    } else if (request.action === "getStatus") {
      sendResponse({
        hasTarget: !!targetElement,
        elementDesc: targetElement ? getElementDescription(targetElement) : "None",
        targetTime: targetTime,
        isScheduled: isScheduled
      });
    }
    return true;
  });

  // Get description for targeted element
  function getElementDescription(el) {
    if (!el) return "None";
    let desc = el.tagName.toLowerCase();
    if (el.id) {
      desc += `#${el.id}`;
    } else if (el.className && typeof el.className === "string") {
      const cleanClass = el.className.replace("pac-target-highlight", "").trim();
      const firstClass = cleanClass.split(/\s+/)[0];
      if (firstClass && !firstClass.startsWith("pac-")) {
        desc += `.${firstClass}`;
      }
    }
    const text = el.innerText || el.value || "";
    if (text) {
      const cleanText = text.trim().substring(0, 15);
      if (cleanText) {
        desc += ` ("${cleanText}")`;
      }
    }
    return desc;
  }

  let panelContainer = null;

  function showSchedulerPanel() {
    // Remove highlight from previous target if any
    const existingHighlight = document.querySelector(".pac-target-highlight");
    if (existingHighlight) {
      existingHighlight.classList.remove("pac-target-highlight");
    }

    // Add highlight class to newly selected element
    if (targetElement) {
      targetElement.classList.add("pac-target-highlight");
    }

    // If panel doesn't exist, create it
    if (!panelContainer) {
      panelContainer = document.createElement("div");
      panelContainer.className = "pac-panel-container";
      panelContainer.innerHTML = `
        <div class="pac-panel" id="pac-panel">
          <div class="pac-header">
            <div class="pac-title-group">
              <span class="pac-logo">🎯</span>
              <h3 class="pac-title">Precision Auto-Clicker</h3>
            </div>
            <button class="pac-close-btn" id="pac-close-btn">&times;</button>
          </div>
          <div class="pac-info-card">
            <div class="pac-info-row">
              <span>Target:</span>
              <span class="pac-info-value" id="pac-element-desc">None</span>
            </div>
          </div>
          <div class="pac-form-group">
            <label class="pac-label">Schedule Click Time</label>
            <div class="pac-input-row">
              <input type="datetime-local" class="pac-input pac-input-date" id="pac-date-input" step="1">
              <input type="number" class="pac-input pac-input-ms" id="pac-ms-input" min="0" max="999" value="0" placeholder="ms">
            </div>
          </div>
          <div class="pac-clock-section">
            <div class="pac-clock-row">
              <span>Local Time:</span>
              <span class="pac-clock-time" id="pac-current-time">00:00:00.000</span>
            </div>
            <div class="pac-clock-row">
              <span>Countdown:</span>
              <span class="pac-countdown" id="pac-countdown">Not Scheduled</span>
            </div>
          </div>
          <button class="pac-button" id="pac-action-btn">Start Scheduler</button>
          <div class="pac-warning-callout">
            💡 <strong>Precision Tip:</strong> Keep this tab active by pinning it to bypass Chrome background resource throttling!
          </div>
        </div>
      `;
      document.body.appendChild(panelContainer);

      // Event listener for closing
      document.getElementById("pac-close-btn").addEventListener("click", hideSchedulerPanel);

      // Event listener for action button
      document.getElementById("pac-action-btn").addEventListener("click", toggleScheduler);

      // Start live time updating in UI
      startLiveUIUpdates();
    }

    // Update targeted element label
    document.getElementById("pac-element-desc").textContent = getElementDescription(targetElement);

    // Set default target time (current local time + 30 seconds)
    const defaultDate = new Date(Date.now() + 30000);
    const year = defaultDate.getFullYear();
    const month = String(defaultDate.getMonth() + 1).padStart(2, '0');
    const day = String(defaultDate.getDate()).padStart(2, '0');
    const hours = String(defaultDate.getHours()).padStart(2, '0');
    const minutes = String(defaultDate.getMinutes()).padStart(2, '0');
    const seconds = String(defaultDate.getSeconds()).padStart(2, '0');
    
    document.getElementById("pac-date-input").value = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
    document.getElementById("pac-ms-input").value = "000";

    // Reset countdown display
    document.getElementById("pac-countdown").textContent = "Ready to Schedule";
    document.getElementById("pac-countdown").style.color = "var(--pac-text-muted)";

    // Make sure panel is visible
    setTimeout(() => {
      const panel = document.getElementById("pac-panel");
      if (panel) panel.classList.add("pac-visible");
    }, 50);
  }

  function hideSchedulerPanel() {
    cancelSchedule();
    const panel = document.getElementById("pac-panel");
    if (panel) {
      panel.classList.remove("pac-visible");
      // Wait for transition before removing
      setTimeout(() => {
        if (panelContainer) {
          panelContainer.remove();
          panelContainer = null;
        }
        if (uiUpdateInterval) {
          clearInterval(uiUpdateInterval);
          uiUpdateInterval = null;
        }
      }, 300);
    }
    if (targetElement) {
      targetElement.classList.remove("pac-target-highlight");
    }
  }

  function startLiveUIUpdates() {
    if (uiUpdateInterval) clearInterval(uiUpdateInterval);

    const timeEl = document.getElementById("pac-current-time");
    const countdownEl = document.getElementById("pac-countdown");

    uiUpdateInterval = setInterval(() => {
      // 1. Update current local time
      const now = new Date();
      const h = String(now.getHours()).padStart(2, "0");
      const m = String(now.getMinutes()).padStart(2, "0");
      const s = String(now.getSeconds()).padStart(2, "0");
      const ms = String(now.getMilliseconds()).padStart(3, "0");
      if (timeEl) {
        timeEl.textContent = `${h}:${m}:${s}.${ms}`;
      }

      // 2. Update countdown if scheduled
      if (isScheduled && targetTime) {
        const remaining = targetTime - Date.now();
        if (remaining > 0) {
          const remSecs = Math.floor(remaining / 1000);
          const remMs = String(remaining % 1000).padStart(3, "0");
          if (countdownEl) {
            countdownEl.textContent = `${remSecs}.${remMs}s remaining`;
            countdownEl.style.color = "var(--pac-warning)";
          }
        } else {
          if (countdownEl) {
            countdownEl.textContent = "Triggering click...";
            countdownEl.style.color = "var(--pac-success)";
          }
        }
      }
    }, 33); // ~30 FPS updates
  }

  function toggleScheduler() {
    if (isScheduled) {
      cancelSchedule();
    } else {
      startSchedule();
    }
  }

  function startSchedule() {
    const dateVal = document.getElementById("pac-date-input").value;
    const msVal = parseInt(document.getElementById("pac-ms-input").value || "0", 10);

    if (!dateVal) {
      alert("Please enter a valid target date and time.");
      return;
    }

    // Parse the date input in local timezone
    const scheduledDate = new Date(dateVal);
    if (isNaN(scheduledDate.getTime())) {
      alert("Invalid date or time format.");
      return;
    }

    targetTime = scheduledDate.getTime() + msVal;
    const now = Date.now();

    if (targetTime <= now) {
      alert("Target time must be in the future!");
      return;
    }

    isScheduled = true;

    // UI Updates
    document.getElementById("pac-date-input").disabled = true;
    document.getElementById("pac-ms-input").disabled = true;
    const actionBtn = document.getElementById("pac-action-btn");
    actionBtn.textContent = "Cancel Schedule";
    actionBtn.classList.add("pac-button-cancel");

    // Start precision timing loop
    runPrecisionTimer();
  }

  function cancelSchedule() {
    isScheduled = false;
    targetTime = null;
    if (preciseTimerId) {
      clearTimeout(preciseTimerId);
      preciseTimerId = null;
    }

    // UI Updates
    const dateInput = document.getElementById("pac-date-input");
    const msInput = document.getElementById("pac-ms-input");
    const actionBtn = document.getElementById("pac-action-btn");
    const countdownEl = document.getElementById("pac-countdown");

    if (dateInput) dateInput.disabled = false;
    if (msInput) msInput.disabled = false;
    if (actionBtn) {
      actionBtn.textContent = "Start Scheduler";
      actionBtn.classList.remove("pac-button-cancel");
    }
    if (countdownEl) {
      countdownEl.textContent = "Cancelled";
      countdownEl.style.color = "var(--pac-text-muted)";
    }
  }

  // The core high-precision timer loop
  function runPrecisionTimer() {
    if (!isScheduled) return;

    const remaining = targetTime - Date.now();

    if (remaining <= 0) {
      executeClick();
      return;
    }

    // Multi-tier timer resolution to sleep comfortably when far away,
    // and transition to spin-lock (busy-waiting) when extremely close.
    if (remaining > 1000) {
      // Sleep in large chunks when far away
      preciseTimerId = setTimeout(runPrecisionTimer, 300);
    } else if (remaining > 100) {
      // Sleep in smaller chunks when getting closer
      preciseTimerId = setTimeout(runPrecisionTimer, 30);
    } else if (remaining > 10) {
      // Very close: check frequently with low setTimeout interval
      preciseTimerId = setTimeout(runPrecisionTimer, 1);
    } else {
      // <= 10ms: enter CPU spin-lock to guarantee millisecond accuracy
      // This blocks the JS main thread for at most 10ms, avoiding context switch delays.
      while (Date.now() < targetTime) {
        // Spin lock
      }
      executeClick();
    }
  }

  function executeClick() {
    if (!isScheduled || !targetElement) return;

    try {
      // Focus target element first
      if (typeof targetElement.focus === "function") {
        targetElement.focus();
      }

      // Simulate full click sequence to trigger all event listeners (React, Angular, Native, etc.)
      const eventTypes = ["pointerdown", "mousedown", "pointerup", "mouseup", "click"];
      eventTypes.forEach((type) => {
        const ev = new MouseEvent(type, {
          view: window,
          bubbles: true,
          cancelable: true,
          buttons: 1
        });
        targetElement.dispatchEvent(ev);
      });
    } catch (e) {
      console.error("Error executing auto-click:", e);
    }

    // Complete scheduling
    isScheduled = false;
    const actionBtn = document.getElementById("pac-action-btn");
    const countdownEl = document.getElementById("pac-countdown");

    if (actionBtn) {
      actionBtn.textContent = "Click Executed!";
      actionBtn.classList.remove("pac-button-cancel");
      actionBtn.style.background = "linear-gradient(135deg, #00f5d4, #00bbf9)";
      actionBtn.style.color = "#0f0c20";
    }

    if (countdownEl) {
      countdownEl.textContent = "Executed successfully!";
      countdownEl.style.color = "var(--pac-success)";
    }

    // Restore elements after short display
    setTimeout(() => {
      hideSchedulerPanel();
    }, 2000);
  }
})();
