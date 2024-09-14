chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getApiKeyAndLanguage") {
    chrome.storage.sync.get(["apiKey", "language"], function (data) {
      sendResponse({ apiKey: data.apiKey, language: data.language || "zh" });
    });
    return true; // Keep the message channel open for asynchronous response
  }
});
// Create context menu on extension installation
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "createPopup",
    title: "DeepSeek AI",
    contexts: ["selection"],
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "createPopup") {
    chrome.tabs.sendMessage(tab.id, {
      action: "createPopup",
      selectedText: info.selectionText,
    });
  }
});
