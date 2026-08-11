export class EventManager {
  constructor(managers) {
    this.managers = managers;
  }

  // 初始化所有事件监听
  initializeEventListeners() {
    // API Key visibility toggle
    this.managers.uiManager.elements.toggleButton.addEventListener(
      "click",
      () => this.managers.uiManager.toggleApiKeyVisibility()
    );

    // API Key validation and hiding on blur
    this.managers.uiManager.elements.apiKeyInput.addEventListener(
      "blur",
      () => {
        this.managers.uiManager.elements.apiKeyInput.type = "password";
        this.managers.uiManager.elements.iconSwitch.src = "../icons/show.svg";
        // 执行API验证
        this.managers.apiKeyManager.handleApiKeyValidation();
      }
    );

    // 服务商切换事件
    this.managers.uiManager.elements.providerSelect.addEventListener(
      "change",
      async (e) => {
        const provider = e.target.value;

        try {
          // 保存服务商选择
          await this.managers.storageManager.saveProvider(provider);

          // 更新UI（包括API密钥和自定义API URL）
          await this.managers.providerUIManager.updateProviderUI(provider);

          // 更新模型选项
          const models = await this.managers.modelManager.updateModelOptions(provider);

          // 先检查是否已设置API Key
          const apiKey = await this.managers.providerManager.getApiKey(provider);

          if (!apiKey) {
            // 已有默认模型时，只需补 API Key，不要误导到“添加模型”流程
            this.managers.uiManager.showMessage(
              this.managers.i18nManager.getTranslation('noApiKey'),
              false
            );

            if (provider !== 'deepseek' && (!models || models.length === 0)) {
              try { document.body.dataset.requireModelKeyProvider = provider; } catch (e) {}
              if (this.managers.modelManager?.showAddModelDialog) {
                this.managers.modelManager.showAddModelDialog();
              } else {
                this.managers.uiManager.showAddModelModal?.();
              }
              this.managers.uiManager.elements.modelApiKey?.focus?.();
            } else {
              this.managers.uiManager.elements.apiKeyInput?.focus?.();
            }
            return;
          }

          // 非 deepseek：若无模型，强制弹出添加模型（使用带有Key自动隐藏逻辑的接口）
          if (provider !== 'deepseek' && (!models || models.length === 0)) {
            if (this.managers.modelManager?.showAddModelDialog) {
              this.managers.modelManager.showAddModelDialog();
            } else {
              this.managers.uiManager.showAddModelModal?.();
            }
          }
        } catch (error) {
          console.error(`服务商切换错误:`, error);
        }
      }
    );

    // 自定义API URL保存
    this.managers.uiManager.elements.customApiUrlInput.addEventListener(
      "blur",
      () => this.managers.providerUIManager.handleCustomApiUrlSave()
    );

    // 关闭模型弹窗按钮
    this.managers.uiManager.elements.closeModelModal?.addEventListener(
      "click",
      () => this.handleCloseModelModal()
    );

    this.managers.uiManager.elements.modelPickerTrigger?.addEventListener(
      "click",
      () => this.managers.modelManager.openModelPicker()
    );

    this.managers.uiManager.elements.closeModelPickerModal?.addEventListener(
      "click",
      () => this.managers.modelManager.closeModelPicker()
    );

    this.managers.uiManager.elements.modelPickerSearch?.addEventListener(
      "input",
      (e) => this.managers.modelManager.handleModelPickerSearch(e.target.value)
    );

    this.managers.uiManager.elements.modelPickerAddButton?.addEventListener(
      "click",
      () => this.managers.modelManager.handleModelPickerAdd()
    );

      // 取消添加模型按钮
    this.managers.uiManager.elements.cancelModelButton?.addEventListener(
      "click",
      () => this.handleCancelModelModal()
    );

    // 保存模型按钮
    this.managers.uiManager.elements.saveModelButton?.addEventListener(
      "click",
      () => this.managers.modelManager.handleSaveModel()
    );

    // 自定义服务商API Key focus事件
    this.managers.uiManager.elements.customProviderApiKey?.addEventListener(
      "focus",
      () => {
        // 确保当获得焦点时内容可见
        this.managers.uiManager.elements.customProviderApiKey.type = "text";
      }
    );

    // 自定义服务商API Key input事件
    this.managers.uiManager.elements.customProviderApiKey?.addEventListener(
      "input",
      () => {
        // 确保在输入时内容可见
        this.managers.uiManager.elements.customProviderApiKey.type = "text";
      }
    );

    // 自定义服务商API Key blur事件
    this.managers.uiManager.elements.customProviderApiKey?.addEventListener(
      "blur",
      () => {
        // 当有内容时，失去焦点时隐藏内容
        if (this.managers.uiManager.getCustomProviderApiKey()) {
          this.managers.uiManager.elements.customProviderApiKey.type = "password";
        }
      }
    );

    // 关闭自定义服务商弹窗按钮
    this.managers.uiManager.elements.closeCustomProviderModal?.addEventListener(
      "click",
      () => this.handleCloseProviderModal()
    );

    // 取消自定义服务商按钮
    this.managers.uiManager.elements.cancelCustomProviderButton?.addEventListener(
      "click",
      () => this.handleCancelProviderModal()
    );

    // 保存自定义服务商按钮
    this.managers.uiManager.elements.saveCustomProviderButton?.addEventListener(
      "click",
      () => this.managers.providerUIManager.handleSaveCustomProvider()
    );

    // 点击弹窗外部关闭弹窗
    this.managers.uiManager.elements.addModelModal?.addEventListener(
      "click",
      (e) => {
        if (e.target === this.managers.uiManager.elements.addModelModal) {
          this.handleCloseModelModal();
        }
      }
    );

    this.managers.uiManager.elements.modelPickerModal?.addEventListener(
      "click",
      (e) => {
        if (e.target === this.managers.uiManager.elements.modelPickerModal) {
          this.managers.modelManager.closeModelPicker();
        }
      }
    );

    this.managers.uiManager.elements.customProviderModal?.addEventListener(
      "click",
      (e) => {
        if (e.target === this.managers.uiManager.elements.customProviderModal) {
          this.handleCloseProviderModal();
        }
      }
    );

    // 删除服务商对话框相关事件监听
    this.managers.uiManager.elements.closeDeleteProviderModal?.addEventListener(
      "click",
      () => this.managers.uiManager.hideDeleteProviderModal()
    );

    this.managers.uiManager.elements.cancelDeleteProviderButton?.addEventListener(
      "click",
      () => this.managers.uiManager.hideDeleteProviderModal()
    );

    this.managers.uiManager.elements.confirmDeleteProviderButton?.addEventListener(
      "click",
      () => this.managers.providerUIManager.handleDeleteProvider()
    );

    this.managers.uiManager.elements.deleteProviderModal?.addEventListener(
      "click",
      (e) => {
        if (e.target === this.managers.uiManager.elements.deleteProviderModal) {
          this.managers.uiManager.hideDeleteProviderModal();
        }
      }
    );

    // Language selection
    this.managers.uiManager.elements.languageSelect.addEventListener(
      "change",
      (e) => {
        this.managers.storageManager.saveLanguage(e.target.value);
        this.managers.i18nManager.updateLabels();
      }
    );

    // Model selection
    this.managers.uiManager.elements.modelSelect.addEventListener(
      "change",
      (e) => {
        const model = e.target.value;
        this.managers.modelManager.setCurrentModel(model);
        // 保存模型选择
        this.managers.storageManager.saveModel(model).then(() => {
          console.log(`✅ 模型已切换为: ${model}`);
        });
      }
    );

    // Selection enabled toggle
    this.managers.uiManager.elements.selectionEnabled.addEventListener(
      "change",
      (e) => this.managers.storageManager.saveSelectionEnabled(e.target.checked)
    );

    // Remember window size toggle
    this.managers.uiManager.elements.rememberWindowSize.addEventListener(
      "change",
      (e) => this.managers.storageManager.saveRememberWindowSize(e.target.checked)
    );

    // Shortcut settings
    document.getElementById('shortcutSettings').addEventListener(
      'click',
      (e) => this.handleShortcutSettings(e)
    );

    // Instructions link
    document.getElementById('instructionsLink').addEventListener(
      'click',
      (e) => this.handleInstructionsLink(e)
    );
  }

  // 处理快捷键设置
  handleShortcutSettings(e) {
    e.preventDefault();
    chrome.tabs.create({
      url: "chrome://extensions/shortcuts"
    });
  }

  // 处理说明链接
  async handleInstructionsLink(e) {
    e.preventDefault();
    const instructionsUrl = chrome.runtime.getURL('Instructions/Instructions.html');
    chrome.tabs.create({
      url: instructionsUrl
    });
  }

  // 处理模型对话框关闭（不清除临时状态，允许恢复）
  handleCloseModelModal() {
    // 使用 ModelManager 的隐藏方法
    if (this.managers.modelManager?.hideAddModelDialog) {
      this.managers.modelManager.hideAddModelDialog();
    } else {
      // 兜底使用 UIManager
      this.managers.uiManager.hideAddModelModal();
    }
  }

  // 处理服务商对话框关闭（不清除临时状态，允许恢复）
  handleCloseProviderModal() {
    // 使用 ProviderUIManager 的隐藏方法
    if (this.managers.providerUIManager?.hideCustomProviderDialog) {
      this.managers.providerUIManager.hideCustomProviderDialog();
    } else {
      // 兜底使用 UIManager
      this.managers.uiManager.hideCustomProviderModal();
    }
  }

  // 处理用户明确取消操作（清除临时状态）
  handleUserCancel(dialogType) {
    if (this.managers.tempStateManager) {
      this.managers.tempStateManager.clearTempState(dialogType);
      console.log(`🗑️ 用户取消操作，清除临时状态: ${dialogType}`);
    }
  }

  // 处理模型对话框取消（清除临时状态）
  handleCancelModelModal() {
    // 清除临时状态
    this.handleUserCancel(this.managers.tempStateManager?.constructor?.TYPES?.ADD_MODEL);
    // 关闭对话框
    this.handleCloseModelModal();
  }

  // 处理服务商对话框取消（清除临时状态）
  handleCancelProviderModal() {
    // 清除临时状态
    this.handleUserCancel(this.managers.tempStateManager?.constructor?.TYPES?.ADD_PROVIDER);
    // 关闭对话框
    this.handleCloseProviderModal();
  }
}
