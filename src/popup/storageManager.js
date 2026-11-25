export class StorageManager {
  constructor() {
    // 缓存最后保存的设置
    this.cachedSettings = null;
  }

  // 获取缓存的设置（用于不需要等待异步操作的场景）
  getCachedSettings() {
    return this.cachedSettings;
  }

  async getSettings() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(
          ["deepseekApiKey", "siliconflowApiKey", "openrouterApiKey","volcengineApiKey" ,"tencentcloudApiKey", "iflytekstarApiKey","baiducloudApiKey","aliyunApiKey", "aihubmixApiKey",
           "deepseekCustomApiUrl", "siliconflowCustomApiUrl", "openrouterCustomApiUrl", "volcengineCustomApiUrl", "tencentcloudCustomApiUrl", "iflytekstarCustomApiUrl", "baiducloudCustomApiUrl", "aliyunCustomApiUrl", "aihubmixCustomApiUrl",
           "language", "model", "provider", "selectionEnabled", "rememberWindowSize", "pinWindow", "customModels", "customSystemPrompt", "shortcuts"],
        (data) => {
          // 更新缓存
          this.cachedSettings = {
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
            provider: data.provider || 'deepseek',
            selectionEnabled: typeof data.selectionEnabled === 'undefined' ? true : data.selectionEnabled,
            rememberWindowSize: typeof data.rememberWindowSize === 'undefined' ? true : data.rememberWindowSize,
            pinWindow: typeof data.pinWindow === 'undefined' ? false : data.pinWindow,
            customModels: data.customModels || {},
            customSystemPrompt: data.customSystemPrompt || '',
            shortcuts: data.shortcuts || {
              'toggle-chat': {
                default: 'Ctrl+Shift+Y',
                description: 'Open or close the chat window (destroys session).',
                displayName: 'Open/Close Chat'
              },
              'show-hide-chat': {
                default: 'Ctrl+Shift+U',
                description: 'Show or hide the chat window (preserves session).',
                displayName: 'Show/Hide Chat'
              }
            }
          };
          resolve(this.cachedSettings);
        }
      );
    });
  }

  async saveApiKey(provider, apiKey) {
    const key = `${provider}ApiKey`;
    return new Promise((resolve) => {
      chrome.storage.sync.set({ [key]: apiKey }, () => {
        // 更新缓存
        if (this.cachedSettings) {
          this.cachedSettings[key] = apiKey;
        }
        resolve();
      });
    });
  }

  async saveLanguage(language) {
    return new Promise((resolve) => {
      chrome.storage.sync.set({ language }, () => {
        // 更新缓存
        if (this.cachedSettings) {
          this.cachedSettings.language = language;
        }
        resolve();
      });
    });
  }

  async saveModel(model) {
    return new Promise((resolve) => {
      chrome.storage.sync.set({ model }, () => {
        // 更新缓存
        if (this.cachedSettings) {
          this.cachedSettings.model = model;
        }
        resolve();
      });
    });
  }

  async saveProvider(provider) {
    return new Promise((resolve) => {
      chrome.storage.sync.set({ provider }, () => {
        // 更新缓存
        if (this.cachedSettings) {
          this.cachedSettings.provider = provider;
        }
        resolve();
      });
    });
  }

  async saveSelectionEnabled(enabled) {
    return new Promise((resolve) => {
      chrome.storage.sync.set({ selectionEnabled: enabled }, () => {
        // 更新缓存
        if (this.cachedSettings) {
          this.cachedSettings.selectionEnabled = enabled;
        }
        resolve();
      });
    });
  }

  async saveRememberWindowSize(enabled) {
    return new Promise((resolve) => {
      chrome.storage.sync.set({ rememberWindowSize: enabled }, () => {
        // 更新缓存
        if (this.cachedSettings) {
          this.cachedSettings.rememberWindowSize = enabled;
        }
        resolve();
      });
    });
  }

  async savePinWindow(enabled) {
    return new Promise((resolve) => {
      chrome.storage.sync.set({ pinWindow: enabled }, () => {
        // 更新缓存
        if (this.cachedSettings) {
          this.cachedSettings.pinWindow = enabled;
        }
        resolve();
      });
    });
  }

  async saveCustomApiUrl(provider, customApiUrl) {
    const key = `${provider}CustomApiUrl`;
    return new Promise((resolve) => {
      chrome.storage.sync.set({ [key]: customApiUrl }, () => {
        // 更新缓存
        if (this.cachedSettings) {
          this.cachedSettings[key] = customApiUrl;
        }
        resolve();
      });
    });
  }

  // 获取指定服务商的自定义模型
  async getCustomModels(provider) {
    return new Promise((resolve) => {
      chrome.storage.sync.get(['customModels'], (data) => {
        const customModels = data.customModels || {};
        resolve(customModels[provider] || []);
      });
    });
  }

  // 保存自定义模型
  async saveCustomModel(provider, modelId, displayName) {
    return new Promise(async (resolve, reject) => {
      try {
        // 获取当前保存的自定义模型
        const settings = await this.getSettings();
        const customModels = settings.customModels || {};
        const providerModels = customModels[provider] || [];

        // 检查模型ID是否已存在
        const existingModelIndex = providerModels.findIndex(model => model.value === modelId);
        if (existingModelIndex >= 0) {
          // 如果已存在，更新显示名称
          providerModels[existingModelIndex].label = displayName;
        } else {
          // 如果不存在，添加新模型
          providerModels.push({
            value: modelId,
            label: displayName
          });
        }

        // 更新保存
        customModels[provider] = providerModels;

        chrome.storage.sync.set({ customModels }, () => {
          // 更新缓存
          if (this.cachedSettings) {
            this.cachedSettings.customModels = customModels;
          }
          resolve();
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  // 删除自定义模型
  async deleteCustomModel(provider, modelId) {
    return new Promise(async (resolve, reject) => {
      try {
        // 获取当前保存的自定义模型
        const settings = await this.getSettings();
        const customModels = settings.customModels || {};
        const providerModels = customModels[provider] || [];

        // 过滤掉要删除的模型
        const updatedModels = providerModels.filter(model => model.value !== modelId);

        // 更新保存
        customModels[provider] = updatedModels;

        // 直接更新 storage
        await this.updateStorage('customModels', customModels);

        // 为了确保完全删除，也更新独立的provider存储
        const storageKey = `customModels_${provider}`;
        try {
          // 从chrome.storage.sync中获取数据
          const data = await this.getFromStorage(storageKey);
          if (data) {
            const providerCustomModels = data.filter(model => model.value !== modelId);
            // 更新storage
            await this.updateStorage(storageKey, providerCustomModels);
          }
        } catch (error) {
          console.error('更新provider特定存储时出错:', error);
          // 继续执行，不阻止主要删除操作
        }

        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  // 辅助方法：从storage中获取数据
  async getFromStorage(key) {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.get(key, (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(result[key]);
        }
      });
    });
  }

  // 辅助方法：更新storage中的数据
  async updateStorage(key, value) {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.set({ [key]: value }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          // 更新缓存
          if (this.cachedSettings && key in this.cachedSettings) {
            this.cachedSettings[key] = value;
          }
          resolve();
        }
      });
    });
  }

  // 保存指定提供商的所有自定义模型
  async saveCustomModels(provider, models) {
    return new Promise(async (resolve, reject) => {
      try {
        // 获取当前保存的所有自定义模型
        const settings = await this.getSettings();
        const customModels = settings.customModels || {};

        // 更新指定提供商的模型列表
        customModels[provider] = models;

        // 保存到chrome.storage.sync
        await this.updateStorage('customModels', customModels);

        // 同时保存到provider特定的存储中，确保数据一致性
        const storageKey = `customModels_${provider}`;
        localStorage.setItem(storageKey, JSON.stringify(models));

        resolve();
      } catch (error) {
        console.error('保存自定义模型列表失败:', error);
        reject(error);
      }
    });
  }

  // 保存默认模型列表
  async saveDefaultModels(provider, models) {
    return new Promise(async (resolve, reject) => {
      try {
        const storageKey = `defaultModels_${provider}`;
        localStorage.setItem(storageKey, JSON.stringify(models));
        resolve();
      } catch (error) {
        console.error('保存默认模型列表失败:', error);
        reject(error);
      }
    });
  }

  // 获取指定服务商的自定义模型（从localStorage读取）
  async getCustomModelsFromLocalStorage(provider) {
    try {
      const storageKey = `customModels_${provider}`;
      const customModelsJson = localStorage.getItem(storageKey);
      if (customModelsJson) {
        return JSON.parse(customModelsJson);
      }
      return [];
    } catch (e) {
      console.error('从localStorage获取自定义模型失败:', e);
      return [];
    }
  }

  // 获取指定服务商的默认模型（从localStorage读取）
  async getDefaultModelsFromLocalStorage(provider) {
    try {
      const storageKey = `defaultModels_${provider}`;
      const defaultModelsJson = localStorage.getItem(storageKey);
      if (defaultModelsJson !== null) {
        return JSON.parse(defaultModelsJson);
      }
      return null; // 返回null而不是空数组，表示没有设置
    } catch (e) {
      console.error('从localStorage获取默认模型失败:', e);
      return null;
    }
  }

  // 保存插件设置
  async saveSettings(settings) {
    return new Promise((resolve) => {
      chrome.storage.sync.set(settings, () => {
        // 更新缓存
        this.cachedSettings = {...this.cachedSettings, ...settings};
        resolve();
      });
    });
  }

  async saveCustomSystemPrompt(prompt) {
    return new Promise((resolve) => {
      chrome.storage.sync.set({ customSystemPrompt: prompt }, () => {
        // 更新缓存
        if (this.cachedSettings) {
          this.cachedSettings.customSystemPrompt = prompt;
        }
        resolve();
      });
    });
  }

  async getCustomSystemPrompt() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(['customSystemPrompt'], (data) => {
        resolve(data.customSystemPrompt || '');
      });
    });
  }

  // 保存快捷键设置
  async saveShortcuts(shortcuts) {
    return new Promise((resolve) => {
      chrome.storage.sync.set({ shortcuts }, () => {
        // 更新缓存
        if (this.cachedSettings) {
          this.cachedSettings.shortcuts = shortcuts;
        }
        resolve();
      });
    });
  }

  // 获取快捷键设置
  async getShortcuts() {
    const settings = await this.getSettings();
    return settings.shortcuts;
  }
}