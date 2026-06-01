document.addEventListener("DOMContentLoaded", () => {
  const statusContainer = document.getElementById("active-target-info");

  // Query the active tab
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const activeTab = tabs[0];
    if (!activeTab || !activeTab.id) {
      statusContainer.innerHTML = "<span>No active tab found.</span>";
      return;
    }

    // Try sending a message to content.js in active tab
    chrome.tabs.sendMessage(activeTab.id, { action: "getStatus" }, (response) => {
      if (chrome.runtime.lastError || !response) {
        statusContainer.innerHTML = "<span style='color: var(--text-muted);'>No scheduler panel active on this page. Right-click an element to start!</span>";
        return;
      }

      if (response.hasTarget) {
        const timeStr = new Date(response.targetTime).toLocaleString();
        const msStr = String(response.targetTime % 1000).padStart(3, '0');
        statusContainer.innerHTML = `
          <div style="width: 100%; display: flex; flex-direction: column; gap: 4px;">
            <div style="display: flex; justify-content: space-between;">
              <span style="color: var(--text-muted)">Element:</span>
              <span class="status-value">${response.elementDesc}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: var(--text-muted)">Target Time:</span>
              <span class="status-value" style="color: var(--success-color)">${timeStr}.${msStr}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: var(--text-muted)">Scheduled:</span>
              <span class="status-value" style="color: ${response.isScheduled ? 'var(--success-color)' : '#ff9f1c'}">
                ${response.isScheduled ? 'Running' : 'Configuring'}
              </span>
            </div>
          </div>
        `;
      } else {
        statusContainer.innerHTML = "<span style='color: var(--text-muted);'>No element targeted yet. Right-click any page element to target it.</span>";
      }
    });
  });
});
