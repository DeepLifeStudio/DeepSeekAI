import { getIsGenerating } from '../services/apiService';
import { getAIResponse } from '../services/apiService';
import { addIconsToElement } from './IconManager';
import { isDarkMode } from '../utils/themeManager';
import { focusInputIfSafe } from '../utils/focusManager';
import { getPopupElement, getAiResponseElement, getShadowContainer } from './ShadowContainer';
import { getContentUiCopy } from '../utils/uiCopy';

const INPUT_SINGLE_LINE_HEIGHT = "48px";
const INPUT_MULTILINE_LINE_HEIGHT = "1.3";
const INPUT_MULTILINE_PADDING = "8px 52px 8px 16px";

const resetTextareaLayout = (textarea) => {
  textarea.style.height = INPUT_SINGLE_LINE_HEIGHT;
  textarea.style.lineHeight = "";
  textarea.style.padding = "";
};

export const createQuestionInputContainer = (aiResponseContainer) => {
  const uiCopy = getContentUiCopy();
  const container = document.createElement("div");
  container.className = "input-container-wrapper";

  container.innerHTML = `
    <div class="input-container">
      <textarea class="expandable-textarea" placeholder="${uiCopy.askPlaceholder}"></textarea>
      <svg class="send-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M22 2L11 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <div class="loading-icon-wrapper tooltip">
      <svg class="loading-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle class="loading-spinner" cx="12" cy="12" r="8" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="32 20" fill="none" />
          <rect class="stop-button" x="9" y="9" width="6" height="6" rx="1.5" fill="currentColor" stroke="none" />
        </svg>
        <span class="tooltiptext">${uiCopy.stop}</span>
      </div>
    </div>
  `;

  const textarea = container.querySelector(".expandable-textarea");
  const sendIcon = container.querySelector(".send-icon");
  const loadingIconWrapper = container.querySelector(".loading-icon-wrapper");
  const loadingIcon = container.querySelector(".loading-icon");
  const inputContainer = container.querySelector(".input-container");

  // 立即应用正确的主题色
  const darkMode = isDarkMode();
  if (darkMode) {
    textarea.style.backgroundColor = 'rgba(58, 58, 60, 0.8)'; // 暗色模式输入框背景
    textarea.style.color = '#ffffff'; // 暗色模式文本颜色
    inputContainer.style.backgroundColor = 'rgba(44, 44, 46, 0.9)'; // 暗色模式容器背景
    container.style.backgroundColor = 'rgba(44, 44, 46, 0.9)'; // 暗色模式外部容器背景
  } else {
    textarea.style.backgroundColor = 'rgba(242, 242, 247, 0.9)'; // 亮色模式输入框背景
    textarea.style.color = '#000000'; // 亮色模式文本颜色
    inputContainer.style.backgroundColor = 'rgba(242, 242, 247, 0.9)'; // 亮色模式容器背景
    container.style.backgroundColor = 'rgba(242, 242, 247, 0.9)'; // 亮色模式外部容器背景
  }

  // 在下一帧过渡到CSS变量控制的样式，确保平滑过渡
  requestAnimationFrame(() => {
    textarea.style.transition = 'background-color 0.2s ease, color 0.2s ease';
    inputContainer.style.transition = 'background-color 0.2s ease';
    container.style.transition = 'background-color 0.2s ease';

    textarea.style.backgroundColor = '';
    textarea.style.color = '';
    inputContainer.style.backgroundColor = '';
    container.style.backgroundColor = '';
  });

  // 设置loading图标的样式并监听主题变化
  const updateLoadingIconStyle = () => {
    const isDark = document.body.classList.contains('dark-mode') ||
                   document.documentElement.classList.contains('dark-mode') ||
                   document.querySelector('.theme-adaptive.dark-mode');
    // 与发送按钮保持一致：亮色用 --text-secondary (#86868b)，暗色用白色
    loadingIcon.style.color = isDark ? '#fff' : '#86868b';
    loadingIcon.style.filter = 'none';
  };

  // 初始化时调用一次
  updateLoadingIconStyle();

  // 添加主题变化监听器
  const themeObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.attributeName === 'class' &&
          (mutation.target.classList.contains('theme-adaptive') ||
           mutation.target.classList.contains('dark-mode'))) {
        updateLoadingIconStyle();
      }
    });
  });

  themeObserver.observe(document.body, { attributes: true });

  setupTextarea(textarea);
  setupSendButton(sendIcon, textarea, aiResponseContainer);
  setupLoadingIcon(loadingIconWrapper);
  setupUpdateButtonState(container);

  return container;
};

const setupTextarea = (textarea) => {
  const textareaState = new WeakMap();

  const initTextareaState = (element) => ({
    isComposing: false,
    lastHeight: 40,
    compositionText: '',
    originalValue: '',
    lock: false
  });

  const getState = (element) => {
    return textareaState.get(element) || initTextareaState(element);
  };

  const updateHasContent = (element) => {
    if (element.value.trim()) {
      element.classList.add('has-content');
    } else {
      element.classList.remove('has-content');
    }
  };

  const performHeightUpdate = (element) => {
    // 保存光标位置
    const cursorPos = element.selectionStart;

    if (!element.value.trim()) {
      // 对于空内容，恢复单行样式
      element.style.transition = 'none';
      resetTextareaLayout(element);

      // 恢复过渡效果
      setTimeout(() => {
        element.style.transition = 'height 0.2s ease, line-height 0.2s ease';
      }, 0);

      // 确保父容器也调整高度
      const inputContainer = element.closest('.input-container');
      if (inputContainer) {
        inputContainer.style.height = 'auto';
      }

      // 添加轻微的视觉反馈
      element.style.backgroundColor = 'var(--input-bg)';
    } else {
      // 检查是否真正需要多行
      const lines = element.value.split('\n');
      const hasMultipleLines = lines.length > 1 || (lines.length === 1 && lines[0].length > 30);

      if (hasMultipleLines) {
        // 多行文本时切换到正常的 line-height 和 padding
        element.style.lineHeight = INPUT_MULTILINE_LINE_HEIGHT;
        element.style.padding = INPUT_MULTILINE_PADDING; // 减小padding

        // 清除之前设置的高度以获得准确的scrollHeight
        element.style.height = '0px';
        // 然后设置为scrollHeight，降低最小高度
        const newHeight = Math.min(Math.max(40, element.scrollHeight), 100); // 降低最小和最大高度
        element.style.height = `${newHeight}px`;
      } else {
        // 单行文本恢复默认布局，保持舒适的占位提示位置
        resetTextareaLayout(element);
      }

      // 确保父容器也调整高度
      const inputContainer = element.closest('.input-container');
      if (inputContainer) {
        inputContainer.style.height = 'auto';
      }

      // 添加轻微的视觉反馈，让用户感知到内容变化
      element.style.backgroundColor = 'var(--input-bg-active, var(--input-bg))';
    }

    // 恢复光标位置
    element.setSelectionRange(cursorPos, cursorPos);
  };

  let lastLineCount = 1;

  // 添加compositionstart和compositionend事件处理程序（解决输入法问题）
  textarea.addEventListener("compositionstart", (event) => {
    const state = getState(event.target);
    state.isComposing = true;
    textareaState.set(event.target, state);
  });

  textarea.addEventListener("compositionend", (event) => {
    const state = getState(event.target);
    state.isComposing = false;
    textareaState.set(event.target, state);
    // 在输入法完成后立即更新高度
    performHeightUpdate(event.target);
  });

  textarea.addEventListener("input", (event) => {
    // 无论任何情况下，在内容变化时都更新高度
    performHeightUpdate(event.target);
    updateHasContent(event.target);

    // 内容变化时提供轻微的输入反馈
    const sendIcon = event.target.parentElement.querySelector('.send-icon');
    if (event.target.value.trim()) {
      // 有内容时高亮发送按钮
      if (sendIcon) {
        sendIcon.style.opacity = '0.8';
        sendIcon.style.color = 'var(--accent-color)';
      }
    } else {
      // 无内容时恢复默认状态
      if (sendIcon) {
        sendIcon.style.opacity = '0.6';
        sendIcon.style.color = 'var(--text-secondary)';
      }
    }

    // 更新行数计数器
    lastLineCount = event.target.value.split('\n').length;
  });

  textarea.addEventListener("keydown", (event) => {
    const state = getState(event.target);

    // 按键反馈 - 使用更自然、更微妙的背景变化
    if (event.key !== 'Tab' && event.key !== 'Meta' && event.key !== 'Alt' && event.key !== 'Control' && event.key !== 'Shift') {
      // 用更微妙的变化替代明显的背景色改变
      event.target.style.backgroundColor = 'var(--input-bg-active-subtle-minimal, var(--input-bg))';
      setTimeout(() => {
        event.target.style.backgroundColor = 'var(--input-bg)';
      }, 120); // 延长恢复时间，使过渡更自然
    }

    if (event.key === "Enter") {
      if (!event.shiftKey && !state.isComposing) {
        event.preventDefault();
        if (!getIsGenerating()) {
          // 回车发送时提供明确的视觉反馈
          const sendIcon = event.target.parentElement.querySelector('.send-icon');
          if (sendIcon) {
            // 发送按钮动画：缩小 → 弹回
            sendIcon.style.transition = 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)';
            sendIcon.style.transform = 'translateY(-50%) scale(0.85)';
            sendIcon.style.opacity = '1';

            setTimeout(() => {
              sendIcon.style.transform = 'translateY(-50%) scale(1)';
              sendQuestion(textarea, aiResponseContainer);
            }, 120);
            return;
          }

          sendQuestion(textarea, aiResponseContainer);
        } else {
          // 当AI正在生成时，Enter键提供"无法发送"的反馈
          event.target.style.animation = 'shake 0.4s cubic-bezier(0.36, 0.07, 0.19, 0.97) both';
          setTimeout(() => {
            event.target.style.animation = '';
          }, 400);
        }
      } else {
        requestAnimationFrame(() => {
          performHeightUpdate(event.target);
        });
      }
    }
  });

  textarea.addEventListener("focus", () => {
    // 添加聚焦状态样式，提供明确的视觉反馈
    textarea.style.boxShadow = '0 0 0 2px var(--accent-color-alpha, rgba(0, 122, 255, 0.2))';
    textarea.style.borderColor = 'var(--accent-color)';

    // 确保当前高度正确
    performHeightUpdate(textarea);
  });

  textarea.addEventListener("blur", (event) => {
    // 移除聚焦状态样式
    textarea.style.boxShadow = 'none';
    textarea.style.borderColor = 'var(--border-color)';

    if (!event.target.value) {
      resetTextareaLayout(event.target);
    }
  });

  // 添加窗口大小改变事件监听器，确保输入框高度适应窗口尺寸变化
  const resizeHandler = () => {
    performHeightUpdate(textarea);
  };
  window.addEventListener('resize', resizeHandler);

  // 初始化时执行一次高度调整
  textarea.style.height = "48px";
  textarea.style.minHeight = "48px";
  textarea.style.maxHeight = "120px";

  // 为cleanup添加事件移除
  textarea._cleanupEvents = () => {
    window.removeEventListener('resize', resizeHandler);
  };

  // 添加输入框动画样式到document
  if (!document.getElementById('input-feedback-styles')) {
    const style = document.createElement('style');
    style.id = 'input-feedback-styles';
    style.textContent = `
      @keyframes shake {
        10%, 90% { transform: translate3d(-1px, 0, 0); }
        20%, 80% { transform: translate3d(1px, 0, 0); }
        30%, 50%, 70% { transform: translate3d(-2px, 0, 0); }
        40%, 60% { transform: translate3d(2px, 0, 0); }
      }

      @keyframes pulseAnimation {
        0% {
          transform: translateY(-50%) scale(1);
        }
        50% {
          transform: translateY(-50%) scale(1.15);
        }
        100% {
          transform: translateY(-50%) scale(1.1);
        }
      }

      .pulse-animation {
        animation: pulseAnimation 0.7s ease-in-out infinite;
      }
    `;
    document.head.appendChild(style);
  }
};

const setupSendButton = (sendIcon, textarea, aiResponseContainer) => {
  const addButtonFeedback = () => {
    // 光标悬停时的视觉反馈
    if (!getIsGenerating()) {
      sendIcon.classList.add('pulse-animation');
      sendIcon.style.color = 'var(--accent-color)';
      sendIcon.style.opacity = '1';
      sendIcon.style.transform = 'translateY(-50%) scale(1.1)';
    }
  };

  const removeButtonFeedback = () => {
    // 移除光标悬停效果
    sendIcon.classList.remove('pulse-animation');
    sendIcon.style.color = 'var(--text-secondary)';
    sendIcon.style.opacity = '0.6';
    sendIcon.style.transform = 'translateY(-50%)';
  };

  // 鼠标悬停效果
  sendIcon.addEventListener("mouseenter", addButtonFeedback);
  sendIcon.addEventListener("mouseleave", removeButtonFeedback);

  // 点击反馈动画
  sendIcon.addEventListener("mousedown", () => {
    if (!getIsGenerating()) {
      sendIcon.style.transform = 'translateY(-50%) scale(0.95)';
    }
  });

  sendIcon.addEventListener("mouseup", () => {
    if (!getIsGenerating()) {
      sendIcon.style.transform = 'translateY(-50%) scale(1.1)';
    }
  });

  // 点击发送按钮处理
  sendIcon.addEventListener("click", () => {
    if (!getIsGenerating()) {
      // 点击反馈动画：缩小 → 弹回
      sendIcon.style.transition = 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)';
      sendIcon.style.transform = 'translateY(-50%) scale(0.85)';

      setTimeout(() => {
        sendIcon.style.transform = 'translateY(-50%) scale(1)';
        sendQuestion(textarea, aiResponseContainer);
      }, 120);
    }
  });
};

const setupLoadingIcon = (loadingIconWrapper) => {
  const loadingIcon = loadingIconWrapper.querySelector(".loading-icon");

  const updateIconStyle = () => {
    if (loadingIcon) {
      const isDark = document.body.classList.contains('dark-mode') ||
                     document.documentElement.classList.contains('dark-mode') ||
                     document.querySelector('.theme-adaptive.dark-mode');
      // 与发送按钮保持一致：亮色用 #86868b，暗色用白色
      loadingIcon.style.color = isDark ? '#fff' : '#86868b';
      loadingIcon.style.filter = 'none';
    }
  };

  // 初始设置
  updateIconStyle();

  // 监听主题变化，更新图标颜色
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' &&
          (mutation.attributeName === 'class' || mutation.attributeName === 'data-theme')) {
        updateIconStyle();
      }
    });
  });

  // 监听document.body和documentElement的class变化
  observer.observe(document.body, { attributes: true, attributeFilter: ['class', 'data-theme'] });
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] });

  loadingIconWrapper.addEventListener("click", () => {
    if (getIsGenerating() && window.currentAbortController) {
      window.currentAbortController.abort();
    }
  });

  // 为加载图标添加一个悬停效果
  loadingIconWrapper.addEventListener("mouseenter", () => {
    if (loadingIcon && getIsGenerating()) {
      loadingIcon.style.opacity = "1";
    }
  });

  loadingIconWrapper.addEventListener("mouseleave", () => {
    if (loadingIcon && getIsGenerating()) {
      loadingIcon.style.opacity = "0.8";
    }
  });

  // 清理函数，防止内存泄漏
  return () => {
    observer.disconnect();
  };
};

const setupUpdateButtonState = (container) => {
  // currentState 追踪上一次的 isGenerating 值，初始为 null 表示未初始化
  let currentState = null;

  const updateSendButtonState = () => {
    const isGenerating = getIsGenerating();

    // 状态未变化时跳过（首次调用 currentState=null 时强制执行）
    if (currentState === isGenerating) {
      return;
    }

    currentState = isGenerating;

    const sendIcon = container.querySelector(".send-icon");
    const loadingIconWrapper = container.querySelector(".loading-icon-wrapper");
    const loadingIcon = container.querySelector(".loading-icon");
    const textarea = container.querySelector(".expandable-textarea");

    if (isGenerating) {
      // 切换到生成状态时增加过渡效果
      sendIcon.style.transition = 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)';
      sendIcon.style.transform = 'translateY(-50%) scale(0.8)';
      sendIcon.style.opacity = '0';

      setTimeout(() => {
        sendIcon.style.display = "none";
        loadingIconWrapper.style.display = "block";
        loadingIconWrapper.style.opacity = '0';
        loadingIconWrapper.style.transform = 'translateY(-50%) scale(0.8)';

        // 强制重绘以应用初始状态
        void loadingIconWrapper.offsetWidth;

        // 应用过渡动画
        loadingIconWrapper.style.transition = 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)';
        loadingIconWrapper.style.opacity = '1';
        loadingIconWrapper.style.transform = 'translateY(-50%) scale(1)';
        loadingIcon.classList.add("active");

        // 更新loading图标样式，与发送按钮颜色一致
        const isDarkMode = document.body.classList.contains('dark-mode') ||
                           document.documentElement.classList.contains('dark-mode') ||
                           document.querySelector('.theme-adaptive.dark-mode');

        loadingIcon.style.color = isDarkMode ? '#fff' : '#86868b';
        loadingIcon.style.filter = 'none';
      }, 150);

      // 禁用输入框
      textarea.style.cursor = "not-allowed";
      textarea.setAttribute("disabled", "disabled");
      textarea.setAttribute("placeholder", "AI is answering...");
      textarea.style.opacity = '0.8';
    } else {
      // 切换回正常状态
      loadingIconWrapper.style.transition = 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)';
      loadingIconWrapper.style.transform = 'translateY(-50%) scale(0.8)';
      loadingIconWrapper.style.opacity = '0';

      setTimeout(() => {
        loadingIconWrapper.style.display = "none";
        loadingIcon.classList.remove("active");

        sendIcon.style.display = "block";
        sendIcon.style.opacity = '0';
        sendIcon.style.transform = 'translateY(-50%) scale(0.8)';

        // 强制重绘以应用初始状态
        void sendIcon.offsetWidth;

        // 应用过渡动画，重置为默认非激活状态
        sendIcon.style.transition = 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)';
        sendIcon.style.opacity = '0.6';
        sendIcon.style.transform = 'translateY(-50%) scale(1)';
        sendIcon.style.color = 'var(--text-secondary)';

        if (textarea.value.trim()) {
          sendIcon.style.opacity = '0.8';
          sendIcon.style.color = 'var(--accent-color)';
        }
      }, 150);

      // 启用输入框
      textarea.style.cursor = "text";
      textarea.removeAttribute("disabled");
      textarea.setAttribute("placeholder", "Ask me anything...");
      textarea.style.opacity = '1';
    }
  };

  // 降低检查频率，减少性能开销
  setInterval(updateSendButtonState, 200);
};

const sendQuestion = (textarea, aiResponseContainer) => {
  const question = textarea.value.trim();
  if (question) {
    // 清空文本域并重置高度
    textarea.style.transition = 'height 0.2s ease, background-color 0.2s ease';

    // 立即创建用户问题并添加到聊天区域
    const aiResponseElement = getAiResponseElement();

    const userQuestionDiv = document.createElement('div');
    userQuestionDiv.className = 'user-question';
    const userQuestionP = document.createElement('p');
    userQuestionP.textContent = question;
    userQuestionP.style.color = 'white';  // 直接设置内联样式，确保颜色正确
    userQuestionDiv.appendChild(userQuestionP);
    addIconsToElement(userQuestionDiv);

    // 设置初始状态：偏下+缩小+透明
    userQuestionDiv.style.opacity = '0';
    userQuestionDiv.style.transform = 'translateY(20px) scale(0.92)';
    userQuestionDiv.style.transition = 'opacity 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)';

    // 立即添加到 DOM
    aiResponseElement.appendChild(userQuestionDiv);

    // 触发重排后应用动画
    requestAnimationFrame(() => {
      userQuestionDiv.style.opacity = '1';
      userQuestionDiv.style.transform = 'translateY(0) scale(1)';
    });

    // 立即滚动到底部
    aiResponseContainer.scrollTop = aiResponseContainer.scrollHeight;

    const ps = aiResponseContainer.perfectScrollbar;
    if (ps) {
      ps.update();
    }

    // 立即清空输入框
    textarea.value = "";
    resetTextareaLayout(textarea);

    // 重置父容器高度
    const containerElement = textarea.closest('.input-container');
    if (containerElement) {
      containerElement.style.height = 'auto';
    }

    textarea.classList.remove('has-content');

    // 延迟创建答案元素，让用户看到消息发送动画
    setTimeout(() => {
      const answerElement = document.createElement("div");
      answerElement.className = "ai-answer";
      answerElement.textContent = "";
      answerElement.classList.add('generating');
      addIconsToElement(answerElement);
      aiResponseElement.appendChild(answerElement);

      aiResponseContainer.scrollTop = aiResponseContainer.scrollHeight;
      if (ps) {
        ps.update();
      }

      const abortController = new AbortController();

      const onGenerationComplete = () => {
        if (answerElement) {
          answerElement.classList.remove('generating');
          answerElement.style.transition = 'background-color 0.5s ease';
          const originalColor = getComputedStyle(answerElement).backgroundColor;
          answerElement.style.backgroundColor = 'var(--success-color-alpha, rgba(52, 199, 89, 0.1))';
          setTimeout(() => {
            answerElement.style.backgroundColor = originalColor;
          }, 1000);
        }
        requestAnimationFrame(() => focusInputIfSafe(getPopupElement()));
      };

      const onGenerationError = () => {
        if (answerElement) {
          answerElement.classList.remove('generating');
          answerElement.classList.add('error');
        }
      };

      getAIResponse(
        question,
        answerElement,
        { controller: abortController },
        ps,
        null,
        aiResponseContainer,
        false,
        null,
        false,
        '',
        onGenerationComplete,
        onGenerationError
      );
    }, 250); // 延迟 250ms，让消息发送动画更明显
  }
};
