chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getApiKey") {
    chrome.storage.sync.get('apiKey', function(data) {
      sendResponse({apiKey: data.apiKey});
    });
    return true;  // 保持消息通道开放，因为 sendResponse 是异步的
  }
});