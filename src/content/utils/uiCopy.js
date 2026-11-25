const CONTENT_UI_COPY = {
  zh: {
    askPlaceholder: '输入你的问题…',
    stop: '停止',
    closeChat: '关闭对话',
    minimizeChat: '最小化',
    pinChat: '固定窗口',
    copyConversation: '复制整段对话',
    reasoningProcess: '思考过程',
    chat: '对话',
    copy: '复制',
    translate: '翻译',
    explain: '解释',
    summarize: '总结',
    email: '邮件',
  },
  en: {
    askPlaceholder: 'Ask me anything...',
    stop: 'Stop',
    closeChat: 'Close chat',
    minimizeChat: 'Minimize chat',
    pinChat: 'Keep chat open',
    copyConversation: 'Copy entire conversation',
    reasoningProcess: 'Reasoning process',
    chat: 'Chat',
    copy: 'Copy',
    translate: 'Translate',
    explain: 'Explain',
    summarize: 'Summarize',
    email: 'Email',
  },
};

let cachedLang = 'en';

try {
  if (typeof chrome !== 'undefined' && chrome.storage?.sync) {
    chrome.storage.sync.get(['interfaceLanguage'], (data) => {
      if (data?.interfaceLanguage) {
        cachedLang = data.interfaceLanguage;
      }
    });
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'sync' && changes.interfaceLanguage?.newValue) {
        cachedLang = changes.interfaceLanguage.newValue;
      }
    });
  }
} catch (_) {}

export function getContentUiCopy(lang) {
  const key = lang || cachedLang || 'en';
  return CONTENT_UI_COPY[key] || CONTENT_UI_COPY.en;
}

export async function loadContentUiCopy() {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage?.sync) {
      const data = await new Promise((resolve) => {
        chrome.storage.sync.get(['interfaceLanguage'], resolve);
      });
      if (data?.interfaceLanguage) {
        cachedLang = data.interfaceLanguage;
      }
    }
  } catch (_) {}
  return getContentUiCopy(cachedLang);
}
