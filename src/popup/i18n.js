export class I18nManager {
  constructor() {
    this.translations = {
      zh: {
        validating: '验证中...',
        saveSuccess: '保存成功',
        apiKeyInvalid: 'API密钥无效或者检查当前选择的模型是否可用',
        apiKeyInvalidStrict: 'API密钥无效',
        modelInvalidStrict: '模型无效或不可用',
        noBalance: '余额不足',
        noApiKey: '请先设置API密钥',
        noModel: '请先选择或添加模型',
        fetchError: '获取失败',
        rememberWindowSize: '保存窗口大小',
        customApiUrlSaveSuccess: '自定义API地址已保存',
        customApiUrlSaveError: '保存自定义API地址失败',
        customApiUrlLabel: '自定义API地址',
        customApiUrlPlaceholder: '输入自定义API地址（或使用默认）',
        apiKeyEmpty: 'API密钥不能为空',
        apiKeyLabel: 'API密钥',
        apiKeyPlaceholder: '在此输入API密钥',
        balanceText: '余额',
        customProviderNameLabel: '服务商名称',
        customProviderNamePlaceholder: '输入自定义服务商名称',
        customProviderNameExamplePlaceholder: '例如: 我的自定义服务商',
        customProviderApiKeyPlaceholder: '请输入API密钥',
        customProviderUrlExamplePlaceholder: 'https://api.example.com/v1/chat/completions',
        customProviderModelNameExamplePlaceholder: '例如: deepseek-v4-flash',
        apiUrlHint: '📝 需使用 OpenAI 兼容的 API 接口格式',
        customProviderEmpty: '服务商名称不能为空',
        customProviderSaveSuccess: '自定义服务商已保存',
        customProviderSaveError: '保存自定义服务商失败',
        customProviderApiUrlEmpty: '自定义服务商需要API地址',
        customProvider: '自定义服务商',
        customModelNameLabel: '模型名称',
        customModelNamePlaceholder: '输入模型名称用于API验证',
        customModelNameEmpty: '模型名称不能为空',
        customModelIdEmpty: '模型ID不能为空',
        saveCustomProviderBtnText: '保存',
        addModel: '添加模型',
        addModelTitle: '添加模型',
        modelPickerTitle: '选择模型',
        modelPickerSearchPlaceholder: '搜索模型名称或 ID',
        modelPickerTriggerPlaceholder: '选择一个模型',
        modelPickerTriggerHint: '为当前服务商选择要使用的模型',
        modelPickerEmptyState: '没有找到匹配的模型',
        modelPickerLegacyBadge: '即将废弃',
        modelPickerCustomBadge: '自定义',
        modelApiKeyLabel: 'API密钥',
        modelApiId: '模型API标识',
        modelDisplayName: '模型显示名称',
        modelApiIdPlaceholder: '输入模型API标识（如 deepseek-v4-flash）',
        modelDisplayNamePlaceholder: '输入模型显示名称（如 我的助手）',
        saveModel: '保存',
        cancelModel: '取消',
        modelSaveSuccess: '模型添加成功',
        modelSaveError: '添加模型失败',
        modelValidationError: '模型验证失败，该模型可能不存在或不可用',
        modelApiIdEmpty: '模型API标识不能为空',
        modelDisplayNameEmpty: '模型显示名称不能为空',
        modelChanged: '模型已更改为',
        processing: '处理中...',
        toggle: '显示/隐藏API密钥',
        'header-title': 'DeepSeek AI',
        providerLabel: '服务商',
        addCustomProvider: '添加服务商',
        apiKeyLink: '获取API密钥',
        modelLabel: '模型',
        selectionEnabledLabel: '快速按钮',
        preferredLanguageLabel: '回答语言',
        interfaceLanguageLabel: '界面语言',
        pinWindowLabel: '固定窗口',
        shortcutSettingsText: '快捷键设置',
        shortcutDescription: '请前往设置快捷键',
        instructionsText: '使用方式',
        githubText: 'GitHub',
        statusText: 'API服务状态',
        feedbackText: '反馈',
        deleteProvider: '删除服务商',
        hideProvider: '隐藏服务商',
        deleteProviderConfirm: '确定要删除服务商 {provider}？此操作不可撤销。',
        hideProviderConfirm: '确定要隐藏服务商 {provider}？您可以稍后在设置中重新启用它。',
        deleteProviderSuccess: '服务商删除成功',
        hideProviderSuccess: '服务商已隐藏',
        deleteProviderError: '删除服务商失败',
        deleteModel: '删除模型',
        deleteModelBtnTitle: '删除模型',
        deleteProviderBtnTitle: '删除服务商',
        confirmDeleteModel: '确定要删除模型 {model}？此操作不可撤销。',
        deleteModelSuccess: '模型删除成功',
        deleteModelError: '删除模型失败',
        modelIdEmpty: '模型API标识不能为空',
        modelNameEmpty: '模型显示名称不能为空',
        deleting: '删除中...',
        saving: '保存中...',
        checkModelOrKeyOrPermission: '请检查模型ID或者API Key，或确认该模型是否有权限使用',
        toggleChatShortcut: '通过同一快捷键可以打开/关闭会话窗口',
        toggleChatTip: '💡 可自定义快捷键以更快地打开/关闭对话窗口',
        customSystemPromptLabel: '自定义系统提示词',
        customSystemPromptText: '配置',
        customSystemPromptTitle: '自定义系统提示词',
        customSystemPromptInputLabel: '系统提示词',
        customSystemPromptPlaceholder: '输入您的自定义系统提示词。这将用于所有AI交互。',
        customSystemPromptHint: '此提示词将与默认语言检测提示词结合使用，用于所有AI交互，但快捷操作按钮有自己的特定提示词除外。',
        customSystemPromptSaveSuccess: '自定义系统提示词保存成功',
        customSystemPromptSaveError: '保存自定义系统提示词失败',
        customSystemPromptEmpty: '系统提示词不能为空'
      },
      en: {
        validating: 'Validating...',
        saveSuccess: 'Saved successfully',
        apiKeyInvalid: 'API key is invalid or check if the current selected model is available',
        apiKeyInvalidStrict: 'API key is invalid',
        modelInvalidStrict: 'Model is invalid or unavailable',
        noBalance: 'Insufficient balance',
        noApiKey: 'Please set API key first',
        noModel: 'Please set or add a model first',
        fetchError: 'Failed to fetch',
        rememberWindowSize: 'Save Window Size',
        customApiUrlSaveSuccess: 'Custom API URL saved',
        customApiUrlSaveError: 'Failed to save custom API URL',
        customApiUrlLabel: 'Custom API URL',
        customApiUrlPlaceholder: 'Enter custom API URL (or use default)',
        apiKeyEmpty: 'API key cannot be empty',
        apiKeyLabel: 'API Key',
        apiKeyPlaceholder: 'Enter API Key here',
        balanceText: 'Balance',
        customProviderNameLabel: 'Provider Name',
        customProviderNamePlaceholder: 'Enter custom provider name',
        customProviderNameExamplePlaceholder: 'e.g. My Custom Provider',
        customProviderApiKeyPlaceholder: 'Please enter API key',
        customProviderUrlExamplePlaceholder: 'https://api.example.com/v1/chat/completions',
        customProviderModelNameExamplePlaceholder: 'e.g. deepseek-v4-flash',
        apiUrlHint: '📝 Must use OpenAI compatible API format',
        customProviderEmpty: 'Provider name cannot be empty',
        customProviderSaveSuccess: 'Custom provider saved',
        customProviderSaveError: 'Failed to save custom provider',
        customProviderApiUrlEmpty: 'Custom provider needs API URL',
        customProvider: 'Custom Provider',
        customModelNameLabel: 'Model Name',
        customModelNamePlaceholder: 'Enter model name for API validation',
        customModelNameEmpty: 'Model name cannot be empty',
        customModelIdEmpty: 'Model ID cannot be empty',
        saveCustomProviderBtnText: 'Save',
        addModel: 'Add Model',
        addModelTitle: 'Add Model',
        modelPickerTitle: 'Choose Model',
        modelPickerSearchPlaceholder: 'Search by model name or ID',
        modelPickerTriggerPlaceholder: 'Select a model',
        modelPickerTriggerHint: 'Choose the model to use for this provider',
        modelPickerEmptyState: 'No matching models found',
        modelPickerLegacyBadge: 'Deprecated',
        modelPickerCustomBadge: 'Custom',
        modelApiKeyLabel: 'API Key',
        modelApiId: 'Model API ID',
        modelDisplayName: 'Model Display Name',
        modelApiIdPlaceholder: 'Enter model API ID (e.g. deepseek-v4-flash)',
        modelDisplayNamePlaceholder: 'Enter model display name (e.g. My Assistant)',
        saveModel: 'Save',
        cancelModel: 'Cancel',
        modelSaveSuccess: 'Model added successfully',
        modelSaveError: 'Failed to add model',
        modelValidationError: 'Model validation failed, this model may not exist or be unavailable',
        modelApiIdEmpty: 'Model API ID cannot be empty',
        modelDisplayNameEmpty: 'Model display name cannot be empty',
        modelChanged: 'Model changed to',
        processing: 'Processing...',
        toggle: 'Show/Hide API Key',
        'header-title': 'DeepSeek AI',
        providerLabel: 'Service Provider',
        addCustomProvider: 'Add Provider',
        apiKeyLink: 'Get API Key',
        modelLabel: 'Model',
        selectionEnabledLabel: 'Quick Button',
        preferredLanguageLabel: 'Response Language',
        interfaceLanguageLabel: 'Interface Language',
        pinWindowLabel: 'Pin Window',
        shortcutSettingsText: 'Shortcut Settings',
        shortcutDescription: 'Please go to set shortcuts',
        instructionsText: 'Usage',
        githubText: 'GitHub',
        statusText: 'API Service Status',
        feedbackText: 'Feedback',
        deleteProvider: 'Delete Provider',
        hideProvider: 'Hide Provider',
        deleteProviderConfirm: 'Are you sure you want to delete {provider}? This action cannot be undone.',
        hideProviderConfirm: 'Are you sure you want to hide {provider}? You can re-enable it later in settings.',
        deleteProviderSuccess: 'Provider deleted successfully',
        hideProviderSuccess: 'Provider hidden successfully',
        deleteProviderError: 'Failed to delete provider',
        deleteModel: 'Delete Model',
        deleteModelBtnTitle: 'Delete Model',
        deleteProviderBtnTitle: 'Delete Provider',
        confirmDeleteModel: 'Are you sure you want to delete model {model}? This action cannot be undone.',
        deleteModelSuccess: 'Model deleted successfully',
        deleteModelError: 'Failed to delete model',
        modelIdEmpty: 'Model API ID cannot be empty',
        modelNameEmpty: 'Model display name cannot be empty',
        deleting: 'Deleting...',
        saving: 'Saving...',
        checkModelOrKeyOrPermission: 'Please check the model ID or API key, or whether the model is permitted for your account',
        toggleChatShortcut: 'Use the same shortcut key to open/close the chat window',
        toggleChatTip: '💡 You can customize shortcuts to quickly open/close the chat window',
        customSystemPromptLabel: 'Custom System Prompt',
        customSystemPromptText: 'Configure',
        customSystemPromptTitle: 'Custom System Prompt',
        customSystemPromptInputLabel: 'System Prompt',
        customSystemPromptPlaceholder: 'Enter your custom system prompt here. This will be used for all AI interactions.',
        customSystemPromptHint: 'This prompt will be combined with the default language detection prompt and used for all AI interactions, except for quick action buttons which have their own specific prompts.',
        customSystemPromptSaveSuccess: 'Custom system prompt saved successfully',
        customSystemPromptSaveError: 'Failed to save custom system prompt',
        customSystemPromptEmpty: 'System prompt cannot be empty'
      }
    };
  }

  getCurrentLang() {
    return localStorage.getItem('preferredLang') || 'en';
  }

  setCurrentLang(lang) {
    localStorage.setItem('preferredLang', lang);
  }

  getTranslation(key) {
    const currentLang = this.getCurrentLang();
    return this.translations[currentLang][key] || key;
  }

  // 更新所有标签的文本内容
  updateLabels() {
    try {
      const currentLang = this.getCurrentLang();

      // 更新标题
      this.updateElementText('header-title', 'header-title');

      // 更新服务商相关标签
      this.updateElementText('providerLabel', 'providerLabel');
      this.updateElementText('customProvider', 'addCustomProvider');

      // 更新API密钥相关标签
      this.updateElementText('apiKeyLabelText', 'apiKeyLabel');
      this.updateElementText('apiKeyLink', 'apiKeyLink');

      // 更新自定义API URL相关标签
      this.updateElementText('customApiUrlLabel', 'customApiUrlLabel');

      // 更新模型相关标签
      this.updateElementText('modelLabel', 'modelLabel');

      // 更新其他设置标签
      this.updateElementText('selectionEnabledLabel', 'selectionEnabledLabel');
      this.updateElementText('preferredLanguageLabel', 'preferredLanguageLabel');
      this.updateElementText('interfaceLanguageLabel', 'interfaceLanguageLabel');
      this.updateElementText('rememberWindowSizeLabel', 'rememberWindowSize');
      this.updateElementText('pinWindowLabel', 'pinWindowLabel');
      this.updateElementText('customSystemPromptLabel', 'customSystemPromptLabel');
      this.updateElementText('customSystemPromptText', 'customSystemPromptText');

      // 更新快捷键设置标签
      this.updateElementText('shortcutSettingsText', 'shortcutSettingsText');
      this.updateElementText('shortcutDescription', 'shortcutDescription');

      // 更新帮助链接标签
      this.updateElementText('instructionsText', 'instructionsText');
      this.updateElementText('githubText', 'githubText');
      this.updateElementText('statusText', 'statusText');
      this.updateElementText('feedbackText', 'feedbackText');

      // 更新弹窗里的"获取API密钥"链接文案
      this.updateElementText('addModelApiKeyLink', 'apiKeyLink');

      // 更新输入框占位符
      this.updateInputPlaceholder('apiKey', 'apiKeyPlaceholder');

      // 更新模态窗口中的输入框placeholder
      this.updateInputPlaceholder('customProviderNameInput', 'customProviderNameExamplePlaceholder');
      this.updateInputPlaceholder('customProviderApiKey', 'customProviderApiKeyPlaceholder');
      this.updateInputPlaceholder('customApiUrlInput', 'customProviderUrlExamplePlaceholder');
      this.updateInputPlaceholder('customModelIdInput', 'customProviderModelNameExamplePlaceholder');
      this.updateInputPlaceholder('customModelNameInput', 'modelDisplayNamePlaceholder');
      this.updateInputPlaceholder('modelApiKey', 'customProviderApiKeyPlaceholder');
      this.updateInputPlaceholder('modelApiId', 'modelApiIdPlaceholder');
      this.updateInputPlaceholder('modelDisplayName', 'modelDisplayNamePlaceholder');
      this.updateInputPlaceholder('customSystemPromptInput', 'customSystemPromptPlaceholder');

      // 更新弹窗标签
      this.updateElementText('customProviderTitle', 'addCustomProvider');
      this.updateElementText('customProviderNameInputLabel', 'customProviderNameLabel');
      this.updateElementText('customProviderApiKeyLabel', 'apiKeyLabel');
      this.updateElementText('customApiUrlInputLabel', 'customApiUrlLabel');
      this.updateElementText('apiUrlHint', 'apiUrlHint');
      this.updateElementText('customModelIdInputLabel', 'modelApiId');
      this.updateElementText('customModelNameInputLabel', 'customModelNameLabel');

      this.updateElementText('addModelTitle', 'addModelTitle');
      this.updateElementText('modelPickerTitle', 'modelPickerTitle');
      this.updateElementText('modelApiKeyLabel', 'modelApiKeyLabel');
      this.updateElementText('modelIdLabel', 'modelApiId');
      this.updateElementText('modelDisplayNameLabel', 'modelDisplayName');

      this.updateElementText('deleteProviderTitle', 'deleteProvider');
      this.updateElementText('deleteModelTitle', 'deleteModel');
      this.updateElementText('customSystemPromptTitle', 'customSystemPromptTitle');
      this.updateElementText('customSystemPromptInputLabel', 'customSystemPromptInputLabel');
      this.updateElementText('customSystemPromptHint', 'customSystemPromptHint');

      // 更新按钮文本
      this.updateElementText('saveCustomProviderButton', 'saveCustomProviderBtnText');
      this.updateElementText('cancelCustomProviderButton', 'cancelModel');
      this.updateElementText('modelPickerAddButton', 'addModel');
      this.updateElementText('saveModelButton', 'saveModel');
      this.updateElementText('cancelModelButton', 'cancelModel');
      this.updateElementText('confirmDeleteProviderButton', 'deleteProvider');
      this.updateElementText('cancelDeleteProviderButton', 'cancelModel');
      this.updateElementText('confirmDeleteModelButton', 'deleteModel');
      this.updateElementText('cancelDeleteModelButton', 'cancelModel');

      this.updateInputPlaceholder('modelPickerSearch', 'modelPickerSearchPlaceholder');
    } catch (error) {
      console.error('更新标签错误:', error);
    }
  }

  // 更新元素文本
  updateElementText(elementId, translationKey) {
    const element = document.getElementById(elementId);
    if (element) {
      element.textContent = this.getTranslation(translationKey);
    }
  }

  // 更新输入框占位符
  updateInputPlaceholder(elementId, translationKey) {
    const element = document.getElementById(elementId);
    if (element) {
      // 保存当前值
      const currentValue = element.value;

      // 更新placeholder
      element.placeholder = this.getTranslation(translationKey);

      // 确保值不会被清空
      if (element.value !== currentValue) {
        element.value = currentValue;
      }
    }
  }
}
