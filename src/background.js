// 在文件开头添加调试日志
const requestControllers = new Map(); // 存储请求控制器

// 加载自定义Provider
async function loadCustomProviders() {
  return new Promise((resolve) => {
    chrome.storage.sync.get('customProviders', (data) => {
      resolve(data.customProviders || []);
    });
  });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getSettings") {
    // 先获取自定义服务商列表，然后再获取其他设置
    chrome.storage.sync.get(['customProviders', 'provider'], async (initialData) => {
      const customProviders = initialData.customProviders || [];
      const provider = initialData.provider || 'deepseek';

      // 构建需要获取的键名列表
      const keysToGet = [
        "deepseekApiKey", "siliconflowApiKey", "openrouterApiKey","volcengineApiKey",
        "tencentcloudApiKey", "iflytekstarApiKey", "baiducloudApiKey", "aliyunApiKey", "aihubmixApiKey",
        "deepseekCustomApiUrl", "siliconflowCustomApiUrl", "openrouterCustomApiUrl",
        "volcengineCustomApiUrl", "tencentcloudCustomApiUrl", "iflytekstarCustomApiUrl",
        "baiducloudCustomApiUrl", "aliyunCustomApiUrl", "aihubmixCustomApiUrl",
        "language", "model", "customSystemPrompt"
      ];

      // 为每个自定义服务商添加API key的键名
      customProviders.forEach(p => {
        if (p.id.startsWith('custom_')) {
          keysToGet.push(`${p.id}ApiKey`);
        }
      });

      chrome.storage.sync.get(keysToGet, (data) => {
        let customApiKey = '';
        let customApiUrl = '';

        if (provider.startsWith('custom_')) {
          const customProvider = customProviders.find(p => p.id === provider);
          if (customProvider) {
            // 先从customProvider中获取apiKey
            customApiKey = customProvider.apiKey || '';
            customApiUrl = customProvider.apiUrl || '';

            // 如果customApiKey为空，尝试从${providerId}ApiKey中获取
            if (!customApiKey) {
              const apiKeyName = `${provider}ApiKey`;
              if (data[apiKeyName]) {
                customApiKey = data[apiKeyName];
              }
            }
          }
        }

        sendResponse({
          deepseekApiKey: data.deepseekApiKey || '',
          siliconflowApiKey: data.siliconflowApiKey || '',
          openrouterApiKey: data.openrouterApiKey || '',
          volcengineApiKey: data.volcengineApiKey || '',
          tencentcloudApiKey: data.tencentcloudApiKey || '',
          iflytekstarApiKey: data.iflytekstarApiKey || '',
          baiducloudApiKey: data.baiducloudApiKey || '',
          aliyunApiKey: data.aliyunApiKey || '',
          aihubmixApiKey: data.aihubmixApiKey || '',
          deepseekCustomApiUrl: data.deepseekCustomApiUrl || '',
          siliconflowCustomApiUrl: data.siliconflowCustomApiUrl || '',
          openrouterCustomApiUrl: data.openrouterCustomApiUrl || '',
          volcengineCustomApiUrl: data.volcengineCustomApiUrl || '',
          tencentcloudCustomApiUrl: data.tencentcloudCustomApiUrl || '',
          iflytekstarCustomApiUrl: data.iflytekstarCustomApiUrl || '',
          baiducloudCustomApiUrl: data.baiducloudCustomApiUrl || '',
          aliyunCustomApiUrl: data.aliyunCustomApiUrl || '',
          aihubmixCustomApiUrl: data.aihubmixCustomApiUrl || '',
          language: data.language || 'en',
          model: data.model || '',
          provider: provider,
          customApiKey: customApiKey,
          customApiUrl: customApiUrl,
          customProviders: customProviders,
          customSystemPrompt: data.customSystemPrompt || ''
        });
      });
    });
    return true;
  }

  if (request.action === "proxyRequest") {
    // 添加调试日志
    console.log(`🌐 代理请求: ${request.url}`);

    // 检查是否是volcengine请求
    if (request.url.includes('volcengine') || request.url.includes('volces.com')) {
      console.log(`🔍 Volcengine请求详情:`);
      console.log(`🔍 完整URL: ${request.url}`);
      console.log(`🔍 请求头: ${JSON.stringify(request.headers)}`);
      console.log(`🔍 请求体: ${request.body}`);

      // 尝试解析请求体以获取模型信息
      try {
        const requestData = JSON.parse(request.body);
        console.log(`🔍 Volcengine请求模型: ${requestData.model}`);
      } catch (e) {
        console.log(`⚠️ 无法解析请求体JSON`);
      }
    }

    const controller = new AbortController();
    const signal = controller.signal;

    // 存储控制器
    if (sender?.tab?.id) {
      requestControllers.set(sender.tab.id, controller);
    }

    // 修复: 确保模型参数被正确添加到请求中
    const processRequest = (requestBody) => {


      fetch(request.url, {
        method: request.method,
        headers: request.headers,
        body: requestBody,
        signal
      })
      .then(async response => {
        // 添加响应状态日志
        console.log(`📥 收到响应: 状态码 ${response.status}`);

        // 如果是volcengine请求，添加更详细的日志
        if (request.url.includes('volcengine') || request.url.includes('volces.com')) {
          console.log(`🔍 Volcengine响应状态码: ${response.status}`);
          if (response.status === 404) {
            console.log(`❌ Volcengine 404错误 - 可能的原因:
              1. API端点不正确: ${request.url}
              2. 模型ID格式不正确
              3. 权限问题`);
          }
        }

        // 如果不是流式响应，直接返回状态
        if (!requestBody.includes('"stream":true')) {
          // 尝试读取响应内容以获取更多错误信息
          try {
            const responseText = await response.text();

            // 添加响应内容日志
            if (request.url.includes('volcengine') || request.url.includes('volces.com')) {
              console.log(`🔍 Volcengine响应内容: ${responseText}`);
            }

            let responseData = null;
            try {
              responseData = JSON.parse(responseText);

              // 添加解析后的响应日志
              if (request.url.includes('volcengine') || request.url.includes('volces.com')) {
                console.log(`🔍 Volcengine解析后的响应: ${JSON.stringify(responseData)}`);
              }
            } catch (e) {
              console.log(`⚠️ 响应不是有效的JSON`);
            }

            sendResponse({
              status: response.status,
              ok: response.ok,
              data: responseData,
              text: responseText
            });
          } catch (error) {
            console.error(`❌ 读取响应内容错误:`, error);
            sendResponse({
              status: response.status,
              ok: response.ok,
              error: error.message
            });
          }
          return;
        }

        if (!response.ok) {
          console.error(`❌ HTTP错误! 状态码: ${response.status}`);
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let sseBuffer = '';

        try {
          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              // Flush any remaining event
              if (sseBuffer.trim()) {
                const event = sseBuffer;
                sseBuffer = '';
                // Process final event
                const dataLines = event.split('\n').filter(l => l.startsWith('data: '));
                const payload = dataLines.map(l => l.slice(6)).join('\n');
                if (sender?.tab?.id) {
                  chrome.tabs.sendMessage(sender.tab.id, {
                    type: "streamResponse",
                    response: { data: `data: ${payload}\n\n`, ok: true, done: false }
                  });
                }
              }

              if (sender?.tab?.id) {
                chrome.tabs.sendMessage(sender.tab.id, {
                  type: "streamResponse",
                  response: { data: 'data: [DONE]\n\n', ok: true, done: true }
                });
              }
              break;
            }

            sseBuffer += decoder.decode(value, { stream: true });

            // Extract complete SSE events separated by blank line (\n\n)
            let sepIndex;
            while ((sepIndex = sseBuffer.indexOf('\n\n')) !== -1) {
              const event = sseBuffer.slice(0, sepIndex);
              sseBuffer = sseBuffer.slice(sepIndex + 2);

              if (!event.trim()) continue;

              // Collect all data lines for the event
              const dataLines = event.split('\n').filter(l => l.startsWith('data: '));
              if (dataLines.length === 0) continue;

              const payload = dataLines.map(l => l.slice(6)).join('\n');

              if (payload === '[DONE]') {
                if (sender?.tab?.id) {
                  chrome.tabs.sendMessage(sender.tab.id, {
                    type: "streamResponse",
                    response: { data: 'data: [DONE]\n\n', ok: true, done: true }
                  });
                }
                // Continue to drain but mark done for content
                continue;
              }

              if (sender?.tab?.id) {
                chrome.tabs.sendMessage(sender.tab.id, {
                  type: "streamResponse",
                  response: { data: `data: ${payload}\n\n`, ok: true, done: false }
                });
              }
            }
          }
        } catch (error) {
          console.error('读取响应流错误:', error);
          if (sender?.tab?.id) {
            chrome.tabs.sendMessage(sender.tab.id, {
              type: "streamResponse",
              response: { ok: false, error: error.message }
            });
          }
        } finally {
          reader.releaseLock();
        }
      })
      .catch(error => {
        console.error('请求错误:', error);

        // 添加更详细的错误日志
        if (request.url.includes('volcengine') || request.url.includes('volces.com')) {
          console.log(`❌ Volcengine请求失败: ${error.message}`);
          console.log(`❌ 请求URL: ${request.url}`);
          console.log(`❌ 请求模型: ${JSON.parse(request.body || '{}').model || '未知'}`);
        }

        sendResponse({
          ok: false,
          error: error.message
        });
      })
      .finally(() => {
        // 清理控制器
        if (sender?.tab?.id) {
          requestControllers.delete(sender.tab.id);
        }
      });
    };

    // 不再对缺失的 model 进行注入，直接按传入的请求体处理
    processRequest(request.body);

    return true;
  }

  if (request.action === "abortRequest") {
    const controller = requestControllers.get(sender.tab.id);
    if (controller) {
      controller.abort();
      requestControllers.delete(sender.tab.id);
    }
    sendResponse({ success: true });
    return true;
  }

  if (request.action === "openPopup") {
    chrome.action.openPopup();
    return true;
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
      selectedText: info.selectionText || null,
      message: info.selectionText || getGreeting()
    });
  }
});

// 全局注册命令监听器
chrome.commands.onCommand.addListener(async (command) => {
  if (command === "toggle-chat") {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || tab.url.startsWith('chrome://') || tab.url.startsWith('edge://')) {
      return;
    }

    // 检查是否有本地文件访问权限
    if (tab.url.startsWith('file://')) {
      const isAllowed = await new Promise(resolve =>
        chrome.extension.isAllowedFileSchemeAccess(resolve)
      );
      if (!isAllowed) {
        chrome.tabs.create({
          url: chrome.runtime.getURL('Instructions/Instructions.html#file-access')
        });
        return;
      }
    }

    try {
      // 使用更可靠的方式获取选中文本
      const [{result}] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const selection = window.getSelection();
          if (selection && selection.toString && selection.toString().trim()) {
            return selection.toString().trim();
          }
          return '';
        }
      });

      // 发送toggleChat消息以实现真正的切换功能
      chrome.tabs.sendMessage(tab.id, {
        action: "toggleChat",
        selectedText: result,
        useGreeting: getGreeting()
      }).catch(err => {
         console.error("DeepSeek AI: Failed to send toggleChat message. Is content script running?", err);
      });
    } catch (error) {
      console.error("获取选中文本出错:", error);
      chrome.tabs.sendMessage(tab.id, {
        action: "toggleChat",
        selectedText: "",
        useGreeting: getGreeting()
      }).catch(err => console.error("DeepSeek AI: Failed to send fallback message:", err));
    }
  } else if (command === "show-hide-chat") {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || tab.url.startsWith('chrome://') || tab.url.startsWith('edge://')) {
      return;
    }

    // 检查是否有本地文件访问权限
    if (tab.url.startsWith('file://')) {
      const isAllowed = await new Promise(resolve =>
        chrome.extension.isAllowedFileSchemeAccess(resolve)
      );
      if (!isAllowed) {
        chrome.tabs.create({
          url: chrome.runtime.getURL('Instructions/Instructions.html#file-access')
        });
        return;
      }
    }

    try {
      // 获取选中文本
      const [{result}] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const selection = window.getSelection();
          if (selection && selection.toString && selection.toString().trim()) {
            return selection.toString().trim();
          }
          return '';
        }
      });

      // 发送showHideChat消息,保留窗口状态
      chrome.tabs.sendMessage(tab.id, {
        action: "showHideChat",
        selectedText: result,
        useGreeting: getGreeting()
      }).catch(err => {
         console.error("DeepSeek AI: Failed to send showHideChat message. Is content script running?", err);
      });
    } catch (error) {
      console.error("获取选中文本出错:", error);
      chrome.tabs.sendMessage(tab.id, {
        action: "showHideChat",
        selectedText: "",
        useGreeting: getGreeting()
      }).catch(err => console.error("DeepSeek AI: Failed to send fallback message:", err));
    }
  } else if (command === "close-chat") {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || tab.url.startsWith('chrome://') || tab.url.startsWith('edge://')) {
      return;
    }

    chrome.tabs.sendMessage(tab.id, {
      action: "closeChat"
    }).catch(err => {
       console.error("DeepSeek AI: Failed to send closeChat message:", err);
    });
  }
});

function getGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) {
    return "Good morning 🥰";
  } else if (hour >= 12 && hour < 18) {
    return "Good afternoon 🥰";
  } else {
    return "Good evening 🥰";
  }
}

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === chrome.runtime.OnInstalledReason.INSTALL) {
    // 打开说明页面
    chrome.tabs.create({
      url: chrome.runtime.getURL('Instructions/Instructions.html')
    });
  }
});
