import { getAllowAutoScroll, scrollToBottom, updateAllowAutoScroll } from "../utils/scrollManager";
import { render, showCodeCopyButtons, isMathBalanced } from "../utils/markdownRenderer";
import {
  getDeepSeekModelLabel,
  resolveDeepSeekModel,
} from "../../popup/deepseekModelConfig.js";

// 全局变量用于存储对话历史
let messages = [];
let isGenerating = false;
let renderQueue = [];

// 用于存储当前响应的内容
let currentReasoningContent = "";
let currentContent = "";

const UI_COPY = {
  zh: {
    missingApiKey: "请先设置 API 密钥。",
    missingModel: "请先选择或添加模型。",
    requestFailed: "请求失败，请检查设置后重试。",
    invalidApiKey: "API 密钥无效或已过期。",
    rateLimited: "请求过于频繁，请稍后重试。",
    serviceUnavailable: "AI 服务暂时不可用，请稍后重试。",
    timedOut: "请求超时，请检查网络后重试。",
    openSettings: "打开设置",
  },
  en: {
    missingApiKey: "Please set your API key first.",
    missingModel: "Please select or add a model first.",
    requestFailed: "The request failed. Check your settings and try again.",
    invalidApiKey: "Your API key is invalid or expired.",
    rateLimited: "Too many requests. Wait a moment and try again.",
    serviceUnavailable: "The AI service is unavailable. Try again in a moment.",
    timedOut: "The request timed out. Check your connection and try again.",
    openSettings: "Open settings",
  },
};

const getUiCopy = (language) => UI_COPY[language] || UI_COPY.en;

function showSettingsPrompt(responseElement, message, actionLabel, existingIconContainer = null) {
  responseElement.textContent = "";

  const messageElement = document.createElement("span");
  messageElement.textContent = message;
  responseElement.appendChild(messageElement);

  const settingsButton = document.createElement("button");
  settingsButton.type = "button";
  settingsButton.textContent = actionLabel;
  Object.assign(settingsButton.style, {
    display: "block",
    marginTop: "8px",
    padding: "0",
    border: "0",
    background: "none",
    color: "var(--accent-color, #0066cc)",
    font: "inherit",
    cursor: "pointer",
    textDecoration: "underline",
  });
  settingsButton.addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "openPopup" });
  });
  responseElement.appendChild(settingsButton);

  if (existingIconContainer) {
    responseElement.appendChild(existingIconContainer);
  }
}

// 使用 Performance API 优化性能监控
const performance = window.performance;

export function getIsGenerating() {
  return isGenerating;
}

const processText = (text, type) => {
  if (type === 'cleanup') {
    return text.trim().replace(/\s+/g, ' ');
  }
  return text;
};

const isElementAtBottom = (el, threshold = 8) => {
  if (!el) return false;
  return el.scrollHeight - (el.scrollTop + el.clientHeight) <= threshold;
};

// 优化渲染队列处理
async function processRenderQueue(responseElement, ps, aiResponseContainer) {
  if (!responseElement?.isConnected || !aiResponseContainer?.isConnected) {
    renderQueue = [];
    return;
  }

  const currentChunk = renderQueue[renderQueue.length - 1];
  if (!currentChunk) return;

  try {
    // 获取或创建reasoning content元素
    if (currentChunk.reasoningContent) {
      let reasoningContentElement = responseElement.querySelector('.reasoning-content');
      if (!reasoningContentElement) {
        reasoningContentElement = document.createElement('div');
        reasoningContentElement.className = 'reasoning-content expanded';
        reasoningContentElement.innerHTML = `
          <div class="reasoning-header">
            <div class="reasoning-toggle"></div>
            <span>Reasoning process</span>
          </div>
          <div class="reasoning-content-inner"></div>
        `;
        responseElement.insertBefore(reasoningContentElement, responseElement.firstChild);

        // 直接绑定点击事件到 reasoning-header
        const reasoningHeader = reasoningContentElement.querySelector('.reasoning-header');
        if (reasoningHeader) {
          reasoningHeader.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            reasoningContentElement.classList.toggle('collapsed');
            reasoningContentElement.classList.toggle('expanded');
          });
        }
      }

      const reasoningInner = reasoningContentElement.querySelector('.reasoning-content-inner');
      if (reasoningInner) {
        const wasAtBottom = isElementAtBottom(reasoningInner);
        const reasoningHtml = render(currentChunk.reasoningContent);
        reasoningInner.innerHTML = reasoningHtml;

        const isCollapsed = reasoningContentElement.classList.contains('collapsed');
        const shouldAutoScrollReasoning = isCollapsed || (getAllowAutoScroll() && wasAtBottom);

        if (shouldAutoScrollReasoning) {
          requestAnimationFrame(() => {
            reasoningInner.scrollTop = reasoningInner.scrollHeight;
          });
        }
      }
    }

    // 获取或创建content容器
    if (currentChunk.content) {
      let contentElement = responseElement.querySelector('.content-container');
      if (!contentElement) {
        contentElement = document.createElement('div');
        contentElement.className = 'content-container';
        responseElement.appendChild(contentElement);
      }

      const text = currentChunk.content?.replace(/^\s+/, '') || "";
      // 流式期间：如果文本中包含数学且尚未闭合，则暂缓渲染，避免中间态错乱
      const containsMath = /\$|\\\(|\\\[/.test(text);
      if (containsMath && !isMathBalanced(text)) {
        // 仅在不平衡时跳过这次渲染，等待后续更完整的片段
      } else {
        const contentHtml = render(text);
        contentElement.innerHTML = contentHtml;
      }
    }

    // 使用requestAnimationFrame优化滚动和更新


    if (getAllowAutoScroll() && aiResponseContainer?.isConnected) {
      requestAnimationFrame(() => {
        scrollToBottom(aiResponseContainer, true);
        if (ps?.update) ps.update();
      });
    }
  } catch (error) {
    console.error('Error processing render queue:', error);
  }
}

// 验证和清理消息历史
function validateAndCleanMessages() {
  // 如果发现连续的user消息，删除前一条
  for (let i = messages.length - 1; i > 0; i--) {
    if (messages[i].role === 'user' && messages[i-1].role === 'user') {
      messages.splice(i-1, 1);
    }
  }
}

export async function getAIResponse(
  text,
  responseElement,
  signal,
  ps,
  iconContainer,
  aiResponseContainer,
  isRefresh = false,
  onComplete,
  isGreeting = false,
  quickActionPrompt = '',
  onGenerationComplete = null,
  onGenerationError = null
) {
  if (!text) return;
  console.log("🚀 getAIResponse called with text:", text);

  isGenerating = true;
  window.currentAbortController = signal?.controller || new AbortController();
  let interfaceLanguage = 'en';

  // 设置中止信号处理
  window.currentAbortController.signal.addEventListener('abort', () => {
    // 发送中止请求消息到background
    chrome.runtime.sendMessage({ action: "abortRequest" });
  });

  if (isRefresh) {
    messages = messages.slice(0, -1);
  }

  validateAndCleanMessages();
  if (!isRefresh) {
    messages.push({ role: "user", content: text });
  }

  const existingIconContainer = responseElement.querySelector('.icon-container');
  const originalClassName = responseElement.className;
  responseElement.textContent = "";
  if (existingIconContainer) {
    responseElement.appendChild(existingIconContainer);
  }
  responseElement.className = originalClassName;

  try {
    const settings = await new Promise(resolve => {
      chrome.runtime.sendMessage({ action: "getSettings" }, resolve);
    });
    interfaceLanguage = settings.interfaceLanguage || 'en';
    const uiCopy = getUiCopy(interfaceLanguage);

    const provider = settings.provider || 'deepseek';
    let apiKey = '';

    // 根据provider选择Api Key
    if (provider.startsWith('custom_')) {
      // 对于自定义服务商，API key可能来自两个地方
      // 1. settings.customApiKey (background.js已经处理过)
      // 2. 如果customApiKey为空，尝试从customProviders数组中获取
      apiKey = settings.customApiKey;

      // 如果从background获取的customApiKey为空，尝试从customProviders中获取
      if (!apiKey && settings.customProviders) {
        const customProvider = settings.customProviders.find(p => p.id === provider);
        if (customProvider && customProvider.apiKey) {
          apiKey = customProvider.apiKey;
        }
      }
    } else {
      apiKey = provider === 'siliconflow' ? settings.siliconflowApiKey :
              provider === 'openrouter' ? settings.openrouterApiKey :
              provider === 'volcengine' ? settings.volcengineApiKey :
              provider === 'tencentcloud' ? settings.tencentcloudApiKey :
              provider === 'iflytekstar' ? settings.iflytekstarApiKey :
              provider === 'baiducloud' ? settings.baiducloudApiKey :
              provider === 'aliyun' ? settings.aliyunApiKey :
              provider === 'aihubmix' ? settings.aihubmixApiKey :
              settings.deepseekApiKey;
    }

    const language = settings.language;
    let model = settings.model;
    const deepseekSelectedModel = isGreeting ? "deepseek-v4-flash" : model;
    const deepseekConfig =
      provider === "deepseek"
        ? resolveDeepSeekModel(deepseekSelectedModel)
        : null;

    // 获取服务商和模型的显示名称
    let providerDisplayName = provider;
    let modelDisplayName = deepseekConfig
      ? getDeepSeekModelLabel(deepseekSelectedModel || deepseekConfig.value)
      : model;

    // 如果是自定义Provider，获取显示名称
    if (provider.startsWith('custom_') && settings.customProviders) {
      const customProvider = settings.customProviders.find(p => p.id === provider);
      if (customProvider) {
        // 获取显示名称
        providerDisplayName = customProvider.name || provider;

        // 如果需要，从自定义服务商中获取模型名称
        if (customProvider.modelName && !model) {
          model = customProvider.modelName;
        }
      }
    }

    // 异步获取模型显示名称
    if (provider.startsWith('custom_') && model) {
      // 尝试从storage获取模型列表
      const modelStorageKey = `${provider}Models`;
      const modelData = await new Promise(resolve => {
        chrome.storage.sync.get(modelStorageKey, resolve);
      });

      if (modelData && modelData[modelStorageKey]) {
        const models = modelData[modelStorageKey];
        const foundModel = models.find(m => m.value === model);
        if (foundModel && foundModel.label) {
          modelDisplayName = foundModel.label;
        }
      }
    }

    // 自定义模型优先级处理
    // console.log(`🔍 使用模型: ${modelDisplayName}, Provider: ${providerDisplayName}`);

    // 获取自定义API URL
    let customApiUrl = '';

    if (provider.startsWith('custom_')) {
      customApiUrl = settings.customApiUrl;
    } else {
      customApiUrl = provider === 'siliconflow' ? settings.siliconflowCustomApiUrl :
                    provider === 'openrouter' ? settings.openrouterCustomApiUrl :
                    provider === 'volcengine' ? settings.volcengineCustomApiUrl :
                    provider === 'tencentcloud' ? settings.tencentcloudCustomApiUrl :
                    provider === 'iflytekstar' ? settings.iflytekstarCustomApiUrl :
                    provider === 'baiducloud' ? settings.baiducloudCustomApiUrl :
                    provider === 'aliyun' ? settings.aliyunCustomApiUrl :
                    provider === 'aihubmix' ? settings.aihubmixCustomApiUrl :
                    settings.deepseekCustomApiUrl;
    }

    if (!apiKey) {
      showSettingsPrompt(
        responseElement,
        uiCopy.missingApiKey,
        uiCopy.openSettings,
        existingIconContainer
      );
      if (typeof onGenerationError === 'function') {
        onGenerationError(uiCopy.missingApiKey);
      }
      return;
    }

    // 在缺少模型时进行拦截（非 deepseek 必须手动填写模型）
    if (provider !== 'deepseek' && (!model || (typeof model === 'string' && model.trim() === ''))) {
      showSettingsPrompt(
        responseElement,
        uiCopy.missingModel,
        uiCopy.openSettings,
        existingIconContainer
      );
      if (typeof onGenerationError === 'function') {
        onGenerationError(uiCopy.missingModel);
      }
      return;
    }

    // 使用自定义API URL或默认URL
    const apiUrl = customApiUrl || (
      provider.startsWith('custom_')
        ? settings.customApiUrl // 自定义Provider直接使用其绑定的URL
        : provider === 'siliconflow'
        ? 'https://api.siliconflow.cn/v1/chat/completions'
        : provider === 'openrouter'
        ? 'https://openrouter.ai/api/v1/chat/completions'
        : provider === 'volcengine'
        ? 'https://ark.cn-beijing.volces.com/api/v3/chat/completions'
        : provider === 'tencentcloud'
        ? 'https://api.lkeap.cloud.tencent.com/v1/chat/completions'
        : provider === 'iflytekstar'
        ? 'https://maas-api.cn-huabei-1.xf-yun.com/v1/chat/completions'
        : provider === 'baiducloud'
        ? 'https://qianfan.baidubce.com/v2/chat/completions'
        : provider === 'aliyun'
        ? 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'
        : provider === 'aihubmix'
        ? 'https://aihubmix.com/v1/chat/completions'
        : 'https://api.deepseek.com/v1/chat/completions'
    );

    const modelName = deepseekConfig ? deepseekConfig.apiModel : model;
    const modelDisplayNameForApi = deepseekConfig ? deepseekConfig.label : modelDisplayName;

    // 确保每次请求都使用正确的模型名称
    // console.log(`📦 调用API - 使用模型: ${modelDisplayNameForApi}`);

    // 获取自定义系统提示
    const customSystemPrompt = settings.customSystemPrompt || '';

    // 构建系统提示
    // 🎯 关键逻辑：如果存在 quickActionPrompt，则完全使用快捷按钮的专用提示，不受自定义系统提示影响
    // 否则，将自定义系统提示与语言设置结合使用
    let systemPrompt = '';

    if (quickActionPrompt) {
      // 快捷按钮有自己的专用提示，直接使用，不与自定义系统提示混合
      systemPrompt = quickActionPrompt;
    } else {
      // 常规对话：结合语言设置和自定义系统提示
      const languagePrompt = language === "auto"
        ? "Detect and respond in the same language as the user's input. If the user's input is in Chinese, respond in Chinese. If the user's input is in English, respond in English, etc."
        : `You MUST respond ONLY in ${language}. Including your reasoningContent language. This is a strict requirement. Do not use any other language except ${language}.`;

      // 如果有自定义系统提示，将其添加到语言提示之后
      systemPrompt = customSystemPrompt
        ? `${languagePrompt}\n\n${customSystemPrompt}`
        : languagePrompt;
    }

    const response = await new Promise((resolve, reject) => {
      let aiResponse = "";
      let reasoningContent = "";
      let aborted = false;
      let isLogged = false;

      window.currentAbortController.signal.addEventListener('abort', () => {
        aborted = true;
        resolve({ ok: true, content: aiResponse });
      });

      function handleResponse(response) {
        if (aborted) return;

        if (chrome.runtime.lastError) {
          const error = new Error(chrome.runtime.lastError.message || 'Chrome runtime error');
          error.originalError = chrome.runtime.lastError;
          reject(error);
          return;
        }

        if (!response.ok) {
          const error = new Error(response.error || 'Request failed');
          error.status = response.status;
          error.originalResponse = response;
          reject(error);
          return;
        }

        if (response.done) {
          if (!isLogged) {
            console.log("LLM Final Response:", JSON.stringify({
              content: aiResponse,
              reasoning_content: reasoningContent
            }, null, 2));
            isLogged = true;
          }
          resolve({ ok: true, content: aiResponse });
          return;
        }

        try {
          const line = response.data;
          if (!line.startsWith("data: ")) return;

          const jsonLine = line.slice(6);
          if (jsonLine === "[DONE]") {
            if (!isLogged) {
              console.log("LLM Final Response:", JSON.stringify({
                content: aiResponse,
                reasoning_content: reasoningContent
              }, null, 2));
              isLogged = true;
            }
            resolve({ ok: true, content: aiResponse });
            return;
          }

          const data = JSON.parse(jsonLine);

          // Synchronous accumulation
          if (provider === 'openrouter' && data.choices?.[0]?.delta?.reasoning) {
            reasoningContent += data.choices[0].delta.reasoning;
            currentReasoningContent = reasoningContent;
          } else if (data.choices?.[0]?.delta?.reasoning_content) {
            reasoningContent += data.choices[0].delta.reasoning_content;
            currentReasoningContent = reasoningContent;
          }

          if (data.choices?.[0]?.delta?.content) {
            aiResponse += data.choices[0].delta.content;
            currentContent = aiResponse;
          }

          requestAnimationFrame(() => {
            renderQueue = [{
              reasoningContent,
              content: aiResponse
            }];
            processRenderQueue(responseElement, ps, aiResponseContainer);
          });
        } catch (e) {
          console.error("Error parsing JSON:", e);
        }
      }

      const messageListener = (msg) => {
        if (msg.type === "streamResponse") {
          handleResponse(msg.response);
          if (msg.response.done) {
            chrome.runtime.onMessage.removeListener(messageListener);
          }
        }
      };

      chrome.runtime.onMessage.addListener(messageListener);

      // console.log(`🚀 发送请求 - 服务商: ${providerDisplayName}, 模型: ${modelDisplayNameForApi},请求体:${apiUrl}`);

      // 确保请求中包含正确的模型名称
      const requestBody = {
        model: modelName,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages
        ],
        stream: true,
        ...(deepseekConfig?.thinking ? { thinking: deepseekConfig.thinking } : {}),
        ...(deepseekConfig?.reasoningEffort
          ? { reasoning_effort: deepseekConfig.reasoningEffort }
          : {}),
        ...(provider === 'openrouter' && { include_reasoning: true })
      };

      // console.log(`📦 请求数据 - 模型: ${modelDisplayNameForApi}`);
      console.log("LLM Request Body:", JSON.stringify(requestBody, null, 2));

      chrome.runtime.sendMessage({
        action: "proxyRequest",
        url: apiUrl,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody)
      });
    });

    // 回答完成后自动折叠推理过程
    const reasoningEl = responseElement.querySelector('.reasoning-content');
    if (reasoningEl) {
      reasoningEl.classList.add('collapsed');
      reasoningEl.classList.remove('expanded');
    }

    if (currentContent) {
      messages.push({ role: "assistant", content: currentContent });
    }
    requestIdleCallback(() => {
      if (window.addIconsToElement) {
        window.addIconsToElement(responseElement);
      }
      if (window.updateLastAnswerIcons) {
        window.updateLastAnswerIcons();
      }
    }, { timeout: 1000 });

    if (iconContainer) {
      iconContainer.style.display = 'flex';
      iconContainer.dataset.initialShow = 'true';

      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const buttonContainer = responseElement.querySelector('.icon-container');
            if (buttonContainer && aiResponseContainer) {
              const buttonRect = buttonContainer.getBoundingClientRect();
              const containerRect = aiResponseContainer.getBoundingClientRect();
              const buttonBottom = buttonRect.bottom - containerRect.top;

              if (buttonBottom > aiResponseContainer.clientHeight) {
                const extraScroll = buttonBottom - aiResponseContainer.clientHeight + 40;
                aiResponseContainer.scrollTop += extraScroll;
                if (ps) ps.update();
              }
            }
            observer.disconnect();
          }
        });
      });

      observer.observe(iconContainer);
    }

    if (onComplete) {
      requestIdleCallback(() => onComplete(), { timeout: 1000 });
    }

    if (onGenerationComplete) {
      onGenerationComplete();
    }
  } catch (error) {
    console.error("Error:", error);

    if (error.name !== 'AbortError') {
      const errorStatus = error.status ?? error.originalResponse?.status ?? 500;
      handleError(errorStatus, responseElement, onGenerationError, interfaceLanguage);
    }
  } finally {
    isGenerating = false;
    window.currentAbortController = null;

    // 显示代码块复制按钮
    requestAnimationFrame(() => {
      showCodeCopyButtons();
    });
  }
}

function handleError(status, responseElement, onGenerationError, interfaceLanguage) {
  isGenerating = false;
  renderQueue = [];

  const uiCopy = getUiCopy(interfaceLanguage);
  let errorMessage = uiCopy.requestFailed;
  let shouldShowSettings = true;
  if (status === 401) {
    errorMessage = uiCopy.invalidApiKey;
  } else if (status === 429) {
    errorMessage = uiCopy.rateLimited;
    shouldShowSettings = false;
  } else if (status >= 500) {
    errorMessage = uiCopy.serviceUnavailable;
    shouldShowSettings = false;
  } else if (status === 0) {
    errorMessage = uiCopy.timedOut;
    shouldShowSettings = false;
  }

  responseElement.classList.add('error'); // 添加错误状态类
  if (shouldShowSettings) {
    showSettingsPrompt(responseElement, errorMessage, uiCopy.openSettings);
  } else {
    responseElement.textContent = errorMessage;
  }

  // 调用错误回调
  if (typeof onGenerationError === 'function') {
    onGenerationError(errorMessage);
  }
}
