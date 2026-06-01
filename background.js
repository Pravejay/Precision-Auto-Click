// Initialize context menu item on installation
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "target-element-autoclicker",
    title: "🎯 Target element for Auto-Click",
    contexts: ["all"]
  });
});

// Handle context menu selection
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "target-element-autoclicker") {
    if (tab && tab.id) {
      chrome.tabs.sendMessage(tab.id, { action: "openScheduler" }, (response) => {
        // Handle runtime error in case content script isn't loaded yet
        if (chrome.runtime.lastError) {
          console.warn("Could not communicate with tab. Make sure the page is fully loaded and refreshed.");
        }
      });
    }
  }
});
