import { ApiKeyManager } from './apiKeyManager.js';
import { I18nManager } from './i18n.js';
import { UiManager } from './uiManager.js';
import { StorageManager } from './storageManager.js';
import { ProviderManager } from './ProviderManager.js';
import { ModelManager } from './ModelManager.js';
import { ProviderUIManager } from './ProviderUIManager.js';
import { EventManager } from './EventManager.js';
import { TempStateManager } from './TempStateManager.js';
import { SystemPromptManager } from './SystemPromptManager.js';

class PopupManager {
  constructor() {
    // 初始化所有管理器
    this.i18nManager = new I18nManager();
    this.uiManager = new UiManager();
    this.storageManager = new StorageManager();
    this.providerManager = new ProviderManager();
    this.tempStateManager = new TempStateManager();

    // 初始化依赖其他管理器的管理器
    this.modelManager = new ModelManager(
      this.providerManager,
      this.storageManager,
      this.uiManager,
      this.i18nManager,
      this.tempStateManager
    );

    this.providerUIManager = new ProviderUIManager(
      this.providerManager,
      this.storageManager,
      this.uiManager,
      this.i18nManager,
      this.tempStateManager
    );

    this.apiKeyManager = new ApiKeyManager(
      this.providerManager,
      this.uiManager,
      this.i18nManager,
      this.modelManager
    );

    this.systemPromptManager = new SystemPromptManager(
      this.storageManager,
      this.uiManager,
      this.i18nManager
    );

    // 将所有管理器传递给事件管理器
    this.eventManager = new EventManager({
      i18nManager: this.i18nManager,
      uiManager: this.uiManager,
      storageManager: this.storageManager,
      providerManager: this.providerManager,
      modelManager: this.modelManager,
      providerUIManager: this.providerUIManager,
      apiKeyManager: this.apiKeyManager,
      tempStateManager: this.tempStateManager,
      systemPromptManager: this.systemPromptManager
    });

    // 初始化
    this.init();
  }

  init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.onDOMReady());
    } else {
      this.onDOMReady();
    }
  }

  onDOMReady() {
    // 确保先更新国际化标签
    this.i18nManager.updateLabels();
    this.eventManager.initializeEventListeners();
    this.loadInitialState();
  }

  async loadInitialState() {
    try {

      // 获取设置
      const settings = await this.storageManager.getSettings();
      const currentProvider = settings.provider || 'deepseek';

      // 检查临时状态并决定是否恢复对话框
      const tempStates = this.tempStateManager.getAllTempStates();


      // 加载所有可见的服务商到下拉菜单
      const visibleProviders = await this.providerManager.getAllVisibleProviders();

      // 清空现有选项
      this.uiManager.elements.providerSelect.innerHTML = '';

      // 添加所有可见的服务商
      for (const provider of visibleProviders) {
        const option = document.createElement('option');
        option.value = provider.id;
        option.textContent = provider.name;
        this.uiManager.elements.providerSelect.appendChild(option);
      }

      // 添加"添加服务商"选项
      const addOption = document.createElement('option');
      addOption.value = 'custom';
      addOption.textContent = this.i18nManager.getTranslation('addCustomProvider');
      addOption.id = 'customProvider';
      this.uiManager.elements.providerSelect.appendChild(addOption);

      // 设置UI元素的初始值
      this.uiManager.elements.languageSelect.value = settings.language;
      this.uiManager.elements.providerSelect.value = currentProvider;
      this.uiManager.elements.selectionEnabled.checked = settings.selectionEnabled;
      this.uiManager.elements.rememberWindowSize.checked = settings.rememberWindowSize;

      // 只清空API密钥输入框，不清空自定义API地址输入框
      this.uiManager.setApiKeyValue('');

      // 创建自定义服务商下拉菜单
      await this.providerUIManager.createCustomProviderDropdown(currentProvider);

      // 更新服务商UI（包括API密钥和自定义API URL的placeholder）
      await this.providerUIManager.updateProviderUI(currentProvider);

      // 更新模型选项
      const models = await this.modelManager.updateModelOptions(currentProvider);

      // 根据临时状态决定要恢复哪个对话框（只有在有实际内容时才恢复）
      if (this.tempStateManager.hasTempStateContent(TempStateManager.TYPES.ADD_PROVIDER)) {
        console.log('🔄 恢复服务商添加对话框...');
        setTimeout(() => this.providerUIManager.showCustomProviderDialog(), 100);
      } else if (this.tempStateManager.hasTempStateContent(TempStateManager.TYPES.ADD_MODEL)) {
        console.log('🔄 恢复模型添加对话框...');
        setTimeout(() => this.modelManager.showAddModelDialog(), 100);
      } else {
        // 如果没有临时状态，执行正常的模型检查逻辑
        // 非 deepseek：若无模型，强制弹出添加模型（使用带有Key自动隐藏逻辑的接口）
        if (currentProvider !== 'deepseek' && (!models || models.length === 0)) {
          if (this.modelManager && this.modelManager.showAddModelDialog) {
            this.modelManager.showAddModelDialog();
          } else if (this.uiManager.showAddModelModal) {
            // 兜底
            this.uiManager.showAddModelModal();
          }
        }
      }

      const hasSavedModel = settings.model && Array.from(this.uiManager.elements.modelSelect.options)
        .some((option) => option.value === settings.model);

      if (hasSavedModel) {
        this.uiManager.elements.modelSelect.value = settings.model;
      }

      this.modelManager.setCurrentModel(this.uiManager.elements.modelSelect.value);

      // 初始化自定义 system prompt 管理器
      await this.systemPromptManager.initialize();

      // 再次更新国际化标签，确保所有动态生成的元素也应用了正确的语言
      this.i18nManager.updateLabels();

    } catch (error) {
      console.error('初始化错误:', error);
    }
  }
}

// 初始化
const popupManager = new PopupManager();

// 全局函数，用于更新内容
window.updateContent = () => {
  // 只更新标签文本，不触发任何其他操作
  if (popupManager && popupManager.i18nManager) {
    popupManager.i18nManager.updateLabels();
  }
};

// 获取当前语言
const getCurrentLang = () => localStorage.getItem('preferredLang') || 'en';

// 设置当前语言
const setCurrentLang = (lang) => {
  localStorage.setItem('preferredLang', lang);
  chrome.storage.sync.set({ interfaceLanguage: lang });
};

const updateInterfaceLanguageControl = () => {
  const currentLang = getCurrentLang();
  const valueElement = document.getElementById('interfaceLanguageValue');
  const toggleButton = document.getElementById('language-toggle');

  if (valueElement) {
    valueElement.textContent = currentLang === 'zh' ? '中文' : 'English';
  }
  if (toggleButton) {
    toggleButton.setAttribute(
      'aria-label',
      currentLang === 'zh' ? '切换界面语言' : 'Switch interface language'
    );
  }
  document.documentElement.lang = currentLang === 'zh' ? 'zh-CN' : 'en';
};

// Keep the content-script error language aligned with the popup UI language.
chrome.storage.sync.set({ interfaceLanguage: getCurrentLang() });
updateInterfaceLanguageControl();

// 语言切换按钮事件
document.getElementById('language-toggle')?.addEventListener('click', () => {
  // 保存当前输入值
  const customApiUrlElement = document.getElementById('customApiUrl');
  const apiKeyElement = document.getElementById('apiKey');

  const currentApiUrl = customApiUrlElement?.value || '';
  const currentApiKey = apiKeyElement?.value || '';

  // 保存当前选中的服务商和模型
  const currentProvider = document.getElementById('provider')?.value || 'deepseek';
  const currentModel = document.getElementById('model')?.value || '';

  // 切换语言
  const currentLang = getCurrentLang();
  const newLang = currentLang === 'zh' ? 'en' : 'zh';
  setCurrentLang(newLang);
  updateInterfaceLanguageControl();

  // 更新UI文本
  if (popupManager && popupManager.i18nManager) {
    popupManager.i18nManager.updateLabels();
  }

  // 恢复输入值
  if (customApiUrlElement) {
    customApiUrlElement.value = currentApiUrl;
  }
  if (apiKeyElement) {
    apiKeyElement.value = currentApiKey;
  }

  // 重新创建自定义服务商下拉菜单
  if (popupManager && popupManager.providerUIManager) {
    popupManager.providerUIManager.createCustomProviderDropdown(currentProvider);
  }

  // 重新创建模型下拉菜单
  if (popupManager && popupManager.modelManager) {
    popupManager.modelManager.updateModelOptions(currentProvider).then(() => {
      const modelSelect = document.getElementById('model');
      const hasCurrentModel = modelSelect && currentModel && Array.from(modelSelect.options)
        .some((option) => option.value === currentModel);

      if (hasCurrentModel) {
        modelSelect.value = currentModel;
      }

      popupManager.modelManager.setCurrentModel(modelSelect?.value || '');

      // 确保模态窗口中的文本也被更新
      if (popupManager && popupManager.i18nManager) {
        popupManager.i18nManager.updateLabels();
      }
    });
  }
});

// 滚动提示逻辑
function initScrollIndicator() {
  const scrollIndicator = document.getElementById('scrollIndicator');
  if (!scrollIndicator) return;

  // 检查是否需要显示滚动提示
  function checkScrollIndicator() {
    const scrollHeight = document.documentElement.scrollHeight;
    const clientHeight = window.innerHeight;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

    const hasScroll = scrollHeight > clientHeight;

    // 只有在需要滚动且在顶部附近时才显示
    if (hasScroll && scrollTop < 20) {
      scrollIndicator.classList.remove('hidden');
    } else {
      scrollIndicator.classList.add('hidden');
    }
  }

  // 监听滚动事件
  function handleScroll() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight;
    const clientHeight = window.innerHeight;

    // 如果已经滚动到底部（允许10px误差），隐藏提示
    if (scrollTop + clientHeight >= scrollHeight - 10) {
      scrollIndicator.classList.add('hidden');
    } else {
      // 只有在确实需要滚动时才显示
      const hasScroll = scrollHeight > clientHeight;
      if (hasScroll && scrollTop < 20) { // 只在顶部附近显示
        scrollIndicator.classList.remove('hidden');
      } else {
        scrollIndicator.classList.add('hidden');
      }
    }
  }

  // 初始化检查
  checkScrollIndicator();

  // 监听窗口大小变化
  window.addEventListener('resize', checkScrollIndicator);

  // 监听滚动事件
  window.addEventListener('scroll', handleScroll);

  // 监听内容变化（因为表单内容可能会动态改变）
  const observer = new MutationObserver(() => {
    setTimeout(checkScrollIndicator, 100);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['style', 'class']
  });
}

// 初始化滚动提示
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initScrollIndicator);
} else {
  initScrollIndicator();
}
