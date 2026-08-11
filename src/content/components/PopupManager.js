
import { popupStateManager } from '../utils/popupStateManager';
import { ensureShadowContainer, getShadowContainer } from './ShadowContainer';
import { createPopup } from '../popup';
import popupStyles from '../styles/style.css?raw';
import katexStyles from 'katex/dist/katex.min.css?raw';

// 动态替换字体路径为绝对路径
const fontBaseUrl = chrome.runtime.getURL('fonts/');
const processedKatexStyles = katexStyles.replace(/url\((['"]?)fonts\//g, (match, quote) => {
  return `url(${quote}${fontBaseUrl}`;
});

const shadowStyles = `${processedKatexStyles}\n${popupStyles}`;

class PopupManager {
  constructor() {
    this.currentPopup = null;
    this.minimizeIcon = null;
    this.isMinimizing = false;
    this.isRememberWindowSize = false;
    this.suppressQuickActionsUntil = 0;
    this.removeQuickActionsCallback = null; // 外部注入的移除快捷按钮回调
    this.removeIconCallback = null; // 外部注入的移除图标回调

    // 初始化设置
    this.loadSettings();

    // 监听设置变化
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'sync') {
        if (changes.rememberWindowSize) {
          this.isRememberWindowSize = changes.rememberWindowSize.newValue;
        }
      }
    });

    // 绑定方法上下文
    this.safeRemovePopup = this.safeRemovePopup.bind(this);
    this.minimizePopup = this.minimizePopup.bind(this);
    this.restorePopup = this.restorePopup.bind(this);
  }

  loadSettings() {
    chrome.storage.sync.get(['rememberWindowSize'], (data) => {
        if (typeof data.rememberWindowSize !== 'undefined') {
            this.isRememberWindowSize = data.rememberWindowSize;
        }
    });
  }

  setCallbacks(removeQuickActions, removeIcon) {
    this.removeQuickActionsCallback = removeQuickActions;
    this.removeIconCallback = removeIcon;
  }

  // 更新安全的弹窗移除函数
  safeRemovePopup(forceRemove = false) {
    // 如果窗口已最小化，不要移除它（除非强制移除）
    if (popupStateManager.isMinimized() && !forceRemove) {
      console.log('窗口已最小化，跳过移除操作');
      return;
    }

    // 立即重置所有状态
    popupStateManager.reset();

    if (!this.currentPopup) {
      window.aiResponseContainer = null;
      return;
    }

    try {
      // 中止正在进行的 AI 响应
      if (window.currentAbortController) {
        window.currentAbortController.abort();
        window.currentAbortController = null;
      }

      // 如果正在生成回答但被中断，清理最后一条不完整的消息
      if (window.aiResponseContainer && window.aiResponseContainer.isGenerating) {
        // 通过消息传递来清理消息历史
        window.dispatchEvent(new CustomEvent('cleanupIncompleteMessage'));
      }

      // 移除所有事件监听器和引用
      if (window.aiResponseContainer) {
        // 清理滚动相关实例
        if (window.aiResponseContainer.perfectScrollbar) {
          window.aiResponseContainer.perfectScrollbar.destroy();
          delete window.aiResponseContainer.perfectScrollbar;
        }

        if (window.aiResponseContainer.scrollStateManager?.cleanup) {
          window.aiResponseContainer.scrollStateManager.cleanup();
          delete window.aiResponseContainer.scrollStateManager;
        }

        if (window.aiResponseContainer.cleanup) {
          window.aiResponseContainer.cleanup();
          delete window.aiResponseContainer.cleanup;
        }

        // 移除所有事件监听器
        const clone = window.aiResponseContainer.cloneNode(true);
        window.aiResponseContainer.parentNode.replaceChild(clone, window.aiResponseContainer);
        window.aiResponseContainer = clone;
      }

      // 保存窗口大小
      if (this.isRememberWindowSize && this.currentPopup.offsetWidth > 100 && this.currentPopup.offsetHeight > 100) {
        const width = this.currentPopup.offsetWidth;
        const height = this.currentPopup.offsetHeight;
        chrome.storage.sync.set({ windowSize: { width, height } });
      }

      // 清理所有观察者和事件监听器
      if (this.currentPopup._resizeObserver) {
        this.currentPopup._resizeObserver.disconnect();
        delete this.currentPopup._resizeObserver;
      }
      if (this.currentPopup._mutationObserver) {
        this.currentPopup._mutationObserver.disconnect();
        delete this.currentPopup._mutationObserver;
      }
      if (this.currentPopup._removeThemeListener) {
        this.currentPopup._removeThemeListener();
        delete this.currentPopup._removeThemeListener;
      }

      // 使用 try-catch 包装 DOM 操作 - 从 Shadow DOM 容器移除
      try {
        const shadowContainer = getShadowContainer();
        const popupParent = shadowContainer?.container || document.body;
        if (popupParent.contains(this.currentPopup)) {
          // 在移除之前先将内容清空，避免触发不必要的事件
          this.currentPopup.innerHTML = '';
          popupParent.removeChild(this.currentPopup);
        }
      } catch (e) {
        console.warn('Error removing popup from DOM:', e);
      }

      // 确保状态被重置
      window.aiResponseContainer = null;
      this.currentPopup = null;
    } catch (error) {
      console.warn('Failed to remove popup:', error);
      // 确保在出错时也能重置所有状态 - 从 Shadow DOM 容器移除
      const shadowContainer = getShadowContainer();
      const popupParent = shadowContainer?.container || document.body;
      if (popupParent.contains(this.currentPopup)) {
        try {
          this.currentPopup.innerHTML = '';
          popupParent.removeChild(this.currentPopup);
        } catch (e) {
          console.warn('Error removing popup in catch block:', e);
        }
      }
      // 重置所有状态
      window.aiResponseContainer = null;
      this.currentPopup = null;
    }

    // 最后再次确保所有状态都被重置
    popupStateManager.reset();
  }

  // 最小化弹窗
  async minimizePopup() {
    console.log('尝试最小化窗口...', { hasPopup: !!this.currentPopup });

    if (!this.currentPopup) {
      console.error('无法最小化：currentPopup 不存在');
      return;
    }
    if (popupStateManager.isMinimized() || this.isMinimizing) return;

    this.isMinimizing = true;

    // 隐藏窗口（带动画）
    this.currentPopup.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
    this.currentPopup.style.opacity = '0';
    this.currentPopup.style.transform = 'scale(0.9)';

    setTimeout(async () => {
      try {
        if (this.currentPopup) {
          this.currentPopup.style.display = 'none';
          popupStateManager.setVisible(false);
          popupStateManager.setMinimized(true);

          console.log('窗口已隐藏，创建小图标...');

          // 创建并显示小图标
          const position = await popupStateManager.loadIconPosition();
          const { createMinimizeIcon } = await import('./IconManager');

          this.minimizeIcon = createMinimizeIcon(() => {
            this.restorePopup();
          }, position);

          document.body.appendChild(this.minimizeIcon);
          console.log('小图标已创建', { position });

          // 触觉反馈
          if ('vibrate' in navigator) {
            navigator.vibrate(8);
          }
        }
      } finally {
        this.isMinimizing = false;
      }
    }, 200);
  }

  // 恢复弹窗
  restorePopup() {
    console.log('尝试恢复窗口...', {
      hasPopup: !!this.currentPopup,
      hasIcon: !!this.minimizeIcon,
      isMinimized: popupStateManager.isMinimized()
    });

    if (!this.currentPopup) {
      console.error('无法恢复窗口：currentPopup 不存在');
      // 清理小图标
      if (this.minimizeIcon && document.body.contains(this.minimizeIcon)) {
        document.body.removeChild(this.minimizeIcon);
        this.minimizeIcon = null;
      }
      popupStateManager.setMinimized(false);
      return;
    }

    // 移除小图标
    if (this.minimizeIcon) {
      this.minimizeIcon.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
      this.minimizeIcon.style.opacity = '0';
      this.minimizeIcon.style.transform = 'scale(0.5)';

      setTimeout(() => {
        if (this.minimizeIcon) {
          if (this.minimizeIcon.cleanup) {
            this.minimizeIcon.cleanup();
          }
          if (document.body.contains(this.minimizeIcon)) {
            document.body.removeChild(this.minimizeIcon);
          }
          this.minimizeIcon = null;
        }
      }, 200);
    }

    // 显示窗口（带动画）
    this.currentPopup.style.display = 'block';
    requestAnimationFrame(() => {
      if (this.currentPopup) {
        this.currentPopup.style.transition = 'opacity 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
        this.currentPopup.style.opacity = '1';
        this.currentPopup.style.transform = 'scale(1)';
      }
    });

    popupStateManager.setVisible(true);
    popupStateManager.setMinimized(false);

    console.log('窗口已恢复');

    // 触觉反馈
    if ('vibrate' in navigator) {
      navigator.vibrate(8);
    }

    // 自动聚焦到输入框
    setTimeout(() => {
      if (this.currentPopup) {
        const textarea = this.currentPopup.querySelector('.expandable-textarea');
        if (textarea) {
          textarea.focus();
        }
      }
    }, 350); // 等待动画完成后聚焦
  }

  handlePopupCreation(selectedText, rect, hideQuestion = false, messages = null, quickActionPrompt = null) {
    if (popupStateManager.isCreating()) return;

    popupStateManager.setCreating(true);

    try {
      // 先移除快捷按钮
      if (this.removeIconCallback) this.removeIconCallback();
      if (this.removeQuickActionsCallback) this.removeQuickActionsCallback();

      // 再兜底清理任何遗留
      try {
        const wrapper = document.getElementById('quick-actions-wrapper');
        if (wrapper && wrapper.parentNode) wrapper.parentNode.removeChild(wrapper);
        const legacy = document.getElementById('fixed-quick-actions-container');
        if (legacy) { legacy.style.opacity = '0'; legacy.style.pointerEvents = 'none'; legacy.innerHTML = ''; }
        document.querySelectorAll('.deepseek-quick-action-buttons, .quick-action-buttons').forEach(n => n.parentNode && n.parentNode.removeChild(n));
      } catch(_) {}

      // 清理最小化图标（如果存在）
      if (this.minimizeIcon && document.body.contains(this.minimizeIcon)) {
        if (this.minimizeIcon.cleanup) {
            this.minimizeIcon.cleanup();
        }
        document.body.removeChild(this.minimizeIcon);
        this.minimizeIcon = null;
        popupStateManager.setMinimized(false);
      }

      this.safeRemovePopup();
      this.currentPopup = createPopup(selectedText, rect, hideQuestion, this.safeRemovePopup, messages, quickActionPrompt, this.minimizePopup);
      this.currentPopup.style.minWidth = '300px';
      this.currentPopup.style.minHeight = '200px';

      if (this.isRememberWindowSize) {
        chrome.storage.sync.get(['windowSize'], (data) => {
          if (data.windowSize &&
              data.windowSize.width >= 300 &&
              data.windowSize.height >= 200 &&
              this.currentPopup) {
            requestAnimationFrame(() => {
              this.currentPopup.style.width = `${data.windowSize.width}px`;
              this.currentPopup.style.height = `${data.windowSize.height}px`;
            });
          }
        });
      }

      // 使用 Shadow DOM 容器挂载弹窗，实现样式隔离
      const shadowContainer = ensureShadowContainer(shadowStyles);
      shadowContainer.container.appendChild(this.currentPopup);
      popupStateManager.setVisible(true);  // 更新状态
      // 打开弹窗后，短时间抑制快捷按钮再次唤起
      this.suppressQuickActionsUntil = Date.now() + 500;

      // 设置窗口大小监听
      if (this.isRememberWindowSize && this.currentPopup) {
        this.setupResizeObserver(this.currentPopup);
      }
    } catch (error) {
      console.error('Error in handlePopupCreation:', error);
      this.safeRemovePopup();
    } finally {
      setTimeout(() => {
        popupStateManager.setCreating(false);
      }, 100);
    }
  }

  // 添加防抖函数
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // 添加 ResizeObserver 设置函数
  setupResizeObserver(popup) {
    if (!popup) return;

    // 如果已存在观察者，先断开连接
    if (popup._resizeObserver) {
      popup._resizeObserver.disconnect();
    }

    // 创建防抖的保存尺寸函数
    const debouncedSaveSize = this.debounce((width, height) => {
      if (width >= 300 && height >= 200) {
        chrome.storage.sync.set({ windowSize: { width, height } });
      }
    }, 500);

    // 创建新的 ResizeObserver
    popup._resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        debouncedSaveSize(width, height);
      }
    });

    // 开始观察
    popup._resizeObserver.observe(popup);
  }
}

export const popupManager = new PopupManager();
