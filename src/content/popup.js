import interact from "interactjs";
import { getAIResponse, getIsGenerating } from "./services/apiService";
import { createDragHandle, initDraggable, resizeMoveListener } from "./components/DragHandle";
import { createQuestionInputContainer } from "./components/InputContainer";
import { styleResponseContainer } from "./components/ResponseContainer";
import { addIconsToElement, updateLastAnswerIcons } from "./components/IconManager";
import { createScrollManager, getAllowAutoScroll, setAllowAutoScroll, updateAllowAutoScroll, handleUserScroll, setupScrollHandlers, scrollToBottom } from './utils/scrollManager';
import { isDarkMode, watchThemeChanges, applyTheme } from './utils/themeManager';
import { STYLE_CONSTANTS } from './utils/constants';
import { popupStateManager } from './utils/popupStateManager';
import { initCopyButtonsVisibility } from "./utils/markdownRenderer";
import { focusInputIfSafe } from './utils/focusManager';
import { ensureShadowContainer, getShadowContainer, destroyShadowContainer, getPopupElement, getAiResponseElement, getAiResponseContainer } from './components/ShadowContainer';
// CSS 作为字符串导入，用于注入到 Shadow DOM
import popupStyles from './styles/style.css?raw';

// 将aiResponseContainer移动到window对象上
window.aiResponseContainer = null;

// 定义全局滚动相关的常量
const SCROLL_CONSTANTS = {
  SCROLL_THRESHOLD: 30,          // 滚动触发阈值
  COOLDOWN_DURATION: 150,        // 滚动冷却时间（毫秒）
  ANIMATION_DURATION: 300,       // 动画持续时间（毫秒）
  VELOCITY_THRESHOLD: 0.5,       // 速度阈值
  MAX_MOMENTUM_SAMPLES: 5        // 最大动量采样数
};

// 新增：动画相关常量
const ANIMATION_CONSTANTS = {
  POPUP_APPEAR_DURATION: 280,    // 弹出动画持续时间
  POPUP_CLOSE_DURATION: 250,     // 关闭动画持续时间
  SPRING_STIFFNESS: 0.3,         // 弹簧刚度系数
  SPRING_DAMPING: 0.7            // 弹簧阻尼系数
};

// 触觉反馈函数
const provideTactileFeedback = (intensity = 8) => {
  if ('vibrate' in navigator) {
    navigator.vibrate(intensity); // 触感反馈，默认8毫秒
  }
};

const adjustPopupPosition = (rect) => {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const popupWidth = parseInt(STYLE_CONSTANTS.DEFAULT_POPUP_WIDTH);
  const popupHeight = parseInt(STYLE_CONSTANTS.DEFAULT_POPUP_HEIGHT);

  // 计算相对于视口的位置
  let adjustedX = rect.left + rect.width / 2 - popupWidth / 2;
  let adjustedY = rect.top + rect.height;

  if (adjustedY + popupHeight > viewportHeight) {
    adjustedY = rect.top - popupHeight;
  }

  adjustedX = Math.max(0, Math.min(adjustedX, viewportWidth - popupWidth));
  adjustedY = Math.max(0, Math.min(adjustedY, viewportHeight - popupHeight));

  return { left: `${adjustedX}px`, top: `${adjustedY}px` };
};

// 获取弹窗初始样式，添加动画相关属性
const getPopupInitialStyle = (rect) => ({
  position: 'fixed',
  width: STYLE_CONSTANTS.DEFAULT_POPUP_WIDTH,
  height: STYLE_CONSTANTS.DEFAULT_POPUP_HEIGHT,
  paddingTop: STYLE_CONSTANTS.DEFAULT_PADDING_TOP,
  backgroundColor: 'var(--bg-primary)',
  boxShadow: '0 0 0 0.5px rgba(0, 0, 0, 0.05), 0 2px 8px rgba(0, 0, 0, 0.06), 0 4px 16px rgba(0, 0, 0, 0.08)',
  backdropFilter: 'blur(25px)',
  borderRadius: '12px',
  zIndex: '2147483647',
  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif',
  overflow: 'hidden',
  userSelect: 'none',
  border: '1px solid var(--border-color)',
  willChange: 'transform, opacity, width, height',
  backfaceVisibility: 'hidden',
  perspective: '1000px',
  transformStyle: 'preserve-3d',
  animation: 'popup-appear-spring 380ms cubic-bezier(0.22, 1, 0.36, 1)',
  opacity: '0',
  transform: 'translateY(8px) scale(0.98)',
  ...adjustPopupPosition(rect)
});

export function createPopup(selectedText, rect, hideQuestion = false, removeCallback, messages = null, quickActionPrompt = null, minimizeCallback = null) {
  // 确保移除快捷按钮
  if (window.currentIcon && document.body.contains(window.currentIcon)) {
    document.body.removeChild(window.currentIcon);
    window.currentIcon = null;
  }

  const popup = document.createElement("div");
  popup.id = "ai-popup";
  popup.classList.add('theme-adaptive');

  const currentTheme = isDarkMode();
  applyTheme(popup, currentTheme);

  Object.assign(popup.style, getPopupInitialStyle(rect));

  // 在下一帧显示弹窗，触发动画
  requestAnimationFrame(() => {
    popup.style.opacity = '1';
    popup.style.transform = 'translateY(0) scale(1)';
  });

  const aiResponseElement = document.createElement("div");
  window.aiResponseContainer = document.createElement("div");
  styleResponseContainer(window.aiResponseContainer);

  const resizeHandle = document.createElement('div');
  resizeHandle.className = 'resize-handle';
  popup.appendChild(resizeHandle);

  // 给resize-handle添加工具提示
  const resizeTooltip = document.createElement('div');
  resizeTooltip.className = 'tool-tip';
  resizeTooltip.textContent = '调整大小';
  resizeTooltip.style.right = '16px';
  resizeTooltip.style.bottom = '16px';
  resizeHandle.classList.add('tooltip-trigger');
  popup.appendChild(resizeTooltip);

  aiResponseElement.id = "ai-response";
  aiResponseElement.style.padding = "0px 30px 0";
  aiResponseElement.style.fontSize = "14px";

  // 检查消息中是否包含自定义问题
  if (messages && messages.length > 0 && messages[0].userQuestion) {
    // 这是自定义问题的情况，我们需要显示选中内容和用户问题
    if (!hideQuestion) {
      // 创建一个组合内容的容器
      const combinedContainer = document.createElement('div');
      combinedContainer.className = 'user-question combined-content';

      // 添加选中内容
      const selectedContentDiv = document.createElement('div');
      selectedContentDiv.className = 'selected-content';

      // 添加选中内容文本
      const selectedContentP = document.createElement('p');
      selectedContentP.textContent = messages[0].content;
      selectedContentP.style.color = 'white';  // 直接设置内联样式
      selectedContentDiv.appendChild(selectedContentP);

      // 添加用户问题
      const userQuestionDiv = document.createElement('div');
      userQuestionDiv.className = 'user-prompt';

      // 添加问题文本
      const userQuestionP = document.createElement('p');
      userQuestionP.textContent = messages[0].userQuestion;
      userQuestionP.style.color = 'white';  // 直接设置内联样式
      userQuestionDiv.appendChild(userQuestionP);

      // 将选中内容和用户问题添加到组合容器
      combinedContainer.appendChild(selectedContentDiv);
      combinedContainer.appendChild(userQuestionDiv);

      // 添加按钮并附加到响应元素
      addIconsToElement(combinedContainer);
      aiResponseElement.appendChild(combinedContainer);
    }
  } else if (!hideQuestion) {
    // 原有的单条消息显示逻辑
    const userQuestionDiv = document.createElement('div');
    userQuestionDiv.className = 'user-question';
    const userQuestionP = document.createElement('p');
    userQuestionP.textContent = selectedText;
    userQuestionP.style.color = 'white';  // 直接设置内联样式，确保颜色正确
    userQuestionDiv.appendChild(userQuestionP);
    addIconsToElement(userQuestionDiv);
    aiResponseElement.appendChild(userQuestionDiv);
  }

  const initialAnswerElement = document.createElement("div");
  initialAnswerElement.className = "ai-answer";
  initialAnswerElement.textContent = "";
  // 添加生成中的类，用于显示进度动画
  initialAnswerElement.classList.add('generating');
  addIconsToElement(initialAnswerElement);
  aiResponseElement.appendChild(initialAnswerElement);

  window.aiResponseContainer.style.paddingBottom = "40px";
  window.aiResponseContainer.appendChild(aiResponseElement);
  popup.appendChild(window.aiResponseContainer);

  // 禁用 PerfectScrollbar，使用原生滚动以确保滚动功能正常
  // const ps = new PerfectScrollbar(window.aiResponseContainer, {
  //   suppressScrollX: true,
  //   wheelPropagation: false,
  //   touchStartThreshold: 0,
  //   wheelEventTarget: window.aiResponseContainer,
  //   minScrollbarLength: 40,
  //   maxScrollbarLength: 300,
  //   swipeEasing: true,
  //   scrollingThreshold: 1000,
  //   wheelSpeed: 1
  // });

  const ps = null; // 禁用 PerfectScrollbar
  window.aiResponseContainer.perfectScrollbar = ps;
  window.aiResponseContainer.scrollStateManager = createScrollManager();

  // 设置滚动处理器
  const cleanupScrollHandlers = setupScrollHandlers(window.aiResponseContainer, ps);
  window.aiResponseContainer.cleanup = () => {
    cleanupScrollHandlers();
    if (ps) {
      ps.destroy();
    }
    if (window.aiResponseContainer.scrollStateManager) {
      window.aiResponseContainer.scrollStateManager.cleanup();
    }
  };

  const removeThemeListener = watchThemeChanges((isDark) => {
    applyTheme(popup, isDark);
  });
  // 保存主题监听器清理函数到 popup 对象
  popup._removeThemeListener = removeThemeListener;

  // 自定义关闭回调，添加关闭动画
  const enhancedRemoveCallback = () => {
    // 提供关闭前的触觉反馈
    provideTactileFeedback(10);

    // 生成过程中优先保留会话，避免误触关闭导致回答和上下文丢失。
    if (getIsGenerating() && typeof minimizeCallback === 'function') {
      minimizeCallback();
      return;
    }

    // 立即调用关闭回调，不使用动画或延迟
    if (removeCallback) removeCallback();
  };

  // 注意：弹窗不在这里挂载到 DOM，由调用者（content.js）负责挂载到 Shadow DOM 容器

  let abortController = new AbortController();
  // 增加回调函数，在生成完成时移除generating类
  const onGenerationComplete = () => {
    if (initialAnswerElement) {
      initialAnswerElement.classList.remove('generating');
      // 添加一个短暂的高亮效果，表示生成完成
      initialAnswerElement.style.transition = 'background-color 0.5s ease';
      const originalColor = getComputedStyle(initialAnswerElement).backgroundColor;
      initialAnswerElement.style.backgroundColor = 'var(--success-color-alpha, rgba(52, 199, 89, 0.1))';

      setTimeout(() => {
        initialAnswerElement.style.backgroundColor = originalColor;
      }, 1000);
    }

    // 生成完成后按条件聚焦输入框
    requestAnimationFrame(() => focusInputIfSafe(popup));
  };

  // 增加错误处理回调
  const onGenerationError = () => {
    if (initialAnswerElement) {
      initialAnswerElement.classList.remove('generating');
      initialAnswerElement.classList.add('error');
    }
  };

  // 如果有自定义问题，需要修改发送到API的内容
  let contentToSend = selectedText;
  if (messages && messages.length > 0 && messages[0].userQuestion) {
    // 合并选中内容和用户问题为一条消息
    contentToSend = `我有如下内容：\n\n${messages[0].content}\n\n我的问题是：${messages[0].userQuestion}`;
  }

  getAIResponse(
    contentToSend,
    initialAnswerElement,
    { controller: abortController },
    ps,
    null,
    window.aiResponseContainer,
    false,
    null,
    false,
    quickActionPrompt,
    onGenerationComplete, // 新增完成回调
    onGenerationError     // 新增错误回调
  );

  // 固定后，点击网页外部不会自动收起当前会话。
  const pinCallback = (isPinned) => {
    popup._isTempPinned = isPinned;
  };

  // 创建标题栏
  const dragHandle = createDragHandle(enhancedRemoveCallback, minimizeCallback, pinCallback);
  popup.appendChild(dragHandle);
  initDraggable(dragHandle, popup);

  // 设置 resize 交互
  setupInteractions(popup, window.aiResponseContainer);

  const questionInputContainer = createQuestionInputContainer(window.aiResponseContainer);
  popup.appendChild(questionInputContainer);

  initCopyButtonsVisibility(window.aiResponseContainer);

  // 添加窗口初始化动画完成事件
  popup.addEventListener('animationend', (e) => {
    if (e.animationName === 'popup-appear-spring') {
      // 窗口出现动画完成后，为输入框增加轻微的聚焦动画
      const textarea = popup.querySelector('.expandable-textarea');
      if (textarea) {
        textarea.style.animation = 'input-attention 0.5s ease-out';
        // 自动聚焦到输入框
        setTimeout(() => {
          textarea.focus();
        }, 100);
      }
      // 添加轻微的弹跳效果，提升确定感
      popup.classList.add('popup-ready');
    }
  });

  // 监听点击事件添加触觉和视觉反馈
  popup.addEventListener('mousedown', (e) => {
    if (e.target.closest('.send-icon') || e.target.closest('.expandable-textarea') ||
        e.target.closest('.close-button') || e.target.closest('.icon-wrapper')) {
      provideTactileFeedback();
    }
  });

  return popup;
}

function setupInteractions(popup, aiResponseContainer) {
  // 拖拽初始化已在异步回调中完成

  let prevCleanup = null;

  interact(popup)
    .resizable({
      edges: { left: true, right: true, bottom: true, top: true },
      margin: 5,
      inertia: {
        resistance: 3,
        minSpeed: 100,
        endSpeed: 50
      },
      modifiers: [
        interact.modifiers.restrictSize({
          min: { width: STYLE_CONSTANTS.MIN_WIDTH, height: STYLE_CONSTANTS.MIN_HEIGHT },
          max: { width: STYLE_CONSTANTS.MAX_WIDTH, height: STYLE_CONSTANTS.MAX_HEIGHT }
        })
      ],
      listeners: {
        move: event => {
          if (prevCleanup) {
            prevCleanup();
          }

          resizeMoveListener(event);

          const cleanup = updateScroll({
            width: event.rect.width,
            height: event.rect.height,
            ps: aiResponseContainer?.perfectScrollbar
          });

          updateInputContainer(popup);
          prevCleanup = cleanup;

          // 新增：调整大小时提供触觉反馈
          if (event.deltaRect.width !== 0 || event.deltaRect.height !== 0) {
            // 限制反馈频率以避免过度震动
            if (!popup._lastFeedbackTime || Date.now() - popup._lastFeedbackTime > 100) {
              provideTactileFeedback();
              popup._lastFeedbackTime = Date.now();
            }
          }
        },
        end: () => {
          if (prevCleanup) {
            prevCleanup();
            prevCleanup = null;
          }
          // 新增：调整大小结束时的视觉反馈
          popup.classList.add('resize-complete');
          setTimeout(() => {
            popup.classList.remove('resize-complete');
          }, 300);
        }
      },
      autoScroll: false
    });

}

function updateScroll({ width, height, ps }) {
  if (!window.aiResponseContainer) return;

  const resizeObserver = new ResizeObserver(entries => {
    for (const entry of entries) {
      const { width, height } = entry.contentRect;
      const stateManager = window.aiResponseContainer.scrollStateManager;

      stateManager.saveScrollPosition(window.aiResponseContainer);
      ps?.update();

      requestAnimationFrame(() => {
        const visibleIconContainer = window.aiResponseContainer.querySelector('.icon-container[style*="display: flex"]');
        if (visibleIconContainer) {
          const containerRect = window.aiResponseContainer.getBoundingClientRect();
          const iconRect = visibleIconContainer.getBoundingClientRect();

          if (iconRect.bottom > containerRect.bottom) {
            window.aiResponseContainer.scrollTop += (iconRect.bottom - containerRect.bottom + 10);
          }
        }

        stateManager.restoreScrollPosition(window.aiResponseContainer);
      });
    }
  });

  resizeObserver.observe(window.aiResponseContainer);

  window.aiResponseContainer.style.height = `calc(${height}px - 60px)`;
  window.aiResponseContainer.style.width = `${width}px`;

  return () => resizeObserver.disconnect();
}

function updateInputContainer(popup) {
  const inputContainer = popup.querySelector('.input-container-wrapper');
  if (inputContainer) {
    Object.assign(inputContainer.style, {
      position: 'absolute',
      bottom: '0',
      width: '100%'
    });
  }
}

function sendQuestionToAI(question) {
  const aiResponseElement = getAiResponseElement();
  const aiResponseContainer = window.aiResponseContainer;

  const userQuestionDiv = document.createElement('div');
  userQuestionDiv.className = 'user-question';
  const userQuestionP = document.createElement('p');
  userQuestionP.textContent = question;
  userQuestionP.style.color = 'white';  // 直接设置内联样式，确保颜色正确
  userQuestionDiv.appendChild(userQuestionP);
  addIconsToElement(userQuestionDiv);
  aiResponseElement.appendChild(userQuestionDiv);

  const answerElement = document.createElement("div");
  answerElement.className = "ai-answer";
  answerElement.textContent = "";
  // 添加生成中类，显示进度动画
  answerElement.classList.add('generating');
  addIconsToElement(answerElement);
  aiResponseElement.appendChild(answerElement);

  // 使用新的滚动方法
  if (aiResponseContainer) {
    scrollToBottom(aiResponseContainer);
  }

  const ps = aiResponseContainer?.perfectScrollbar;
  if (ps) {
    ps.update();
  }

  const abortController = new AbortController();

  // 添加回调函数处理生成完成和错误情况
  const onGenerationComplete = () => {
    if (answerElement) {
      answerElement.classList.remove('generating');
      // 添加一个短暂的高亮效果，表示生成完成
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
}

export function stylePopup(popup, rect) {
  popup.id = "ai-popup";
  Object.assign(popup.style, adjustPopupPosition(rect));

  // 添加主题相关的样式类
  popup.classList.add('theme-adaptive');

  // 只在调整大小时阻止文本选择
  popup.addEventListener('mousedown', function(e) {
    if (e.target.closest('.resize-handle') || e.target.closest('.drag-handle')) {
      e.preventDefault();
    }
  });

  // 只在鼠标离开弹窗时清除选择
  popup.addEventListener('mouseleave', function(e) {
    // 检查鼠标是否真的离开了弹窗（不是移动到子元素）
    if (!e.relatedTarget || !popup.contains(e.relatedTarget)) {
      // 不要清除选择，让用户自己决定是否保留选择
      // window.getSelection().removeAllRanges();
    }
  });

  // 添加自动滚动功能
  let autoScrollInterval = null;
  const scrollSpeed = 5; // 滚动速度
  const scrollThreshold = 30; // 触发滚动的边缘距离

  popup.addEventListener('mousemove', function(e) {
    const responseContainer = getAiResponseContainer();
    if (!responseContainer) return;

    // 使用 requestAnimationFrame 来优化滚动性能
    if (window.getSelection().toString()) {
      const popupRect = popup.getBoundingClientRect();
      const mouseY = e.clientY;
      const relativeY = mouseY - popupRect.top;

      if (autoScrollInterval) {
        clearInterval(autoScrollInterval);
        autoScrollInterval = null;
      }

      if (relativeY < scrollThreshold) {
        autoScrollInterval = setInterval(() => {
          requestAnimationFrame(() => {
            responseContainer.scrollTop -= scrollSpeed;
          });
        }, 16);
      } else if (relativeY > popup.offsetHeight - scrollThreshold) {
        autoScrollInterval = setInterval(() => {
          requestAnimationFrame(() => {
            responseContainer.scrollTop += scrollSpeed;
          });
        }, 16);
      }
    }
  }, { passive: true });

  popup.addEventListener('mouseleave', () => {
    if (autoScrollInterval) {
      clearInterval(autoScrollInterval);
      autoScrollInterval = null;
    }
  }, { passive: true });

  document.addEventListener('mouseup', () => {
    if (autoScrollInterval) {
      clearInterval(autoScrollInterval);
      autoScrollInterval = null;
    }
  }, { passive: true });
}

// 在文档中添加输入框动画和弹窗动画样式
document.addEventListener('DOMContentLoaded', () => {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes input-attention {
      0% { box-shadow: 0 0 0 0px var(--focus-state); }
      50% { box-shadow: 0 0 0 3px var(--focus-state); }
      100% { box-shadow: 0 0 0 0px transparent; }
    }

    .resize-complete {
      animation: resize-complete 0.3s ease-out;
    }

    @keyframes resize-complete {
      0% { box-shadow: 0 0 0 3px var(--focus-state); }
      100% { box-shadow: 0 0 0 0px rgba(0, 0, 0, 0.05), 0 2px 8px rgba(0, 0, 0, 0.06), 0 4px 16px rgba(0, 0, 0, 0.08); }
    }

    /* 新增弹簧动画效果 */
    @keyframes popup-appear-spring {
      0% {
        opacity: 0;
        transform: translateY(12px) scale(0.96);
      }
      40% {
        opacity: 1;
        transform: translateY(-5px) scale(1.01);
      }
      70% {
        transform: translateY(2px) scale(0.99);
      }
      100% {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    /* 隐藏动画 */
    @keyframes popup-hide {
      0% {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
      100% {
        opacity: 0;
        transform: translateY(8px) scale(0.98);
      }
    }

    /* 关闭动画 */
    @keyframes popup-close {
      0% {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
      100% {
        opacity: 0;
        transform: translateY(8px) scale(0.96);
      }
    }

    /* 准备就绪的轻微弹跳效果 */
    .popup-ready {
      animation: popup-ready 0.4s ease-out;
    }

    @keyframes popup-ready {
      0% { transform: scale(1); }
      50% { transform: scale(1.01); }
      100% { transform: scale(1); }
    }

    /* 拖拽放置时的动画增强 */
    .theme-adaptive #ai-popup.drag-placed {
      animation: drag-placed 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    @keyframes drag-placed {
      0% { transform: scale(1.03); }
      50% { transform: scale(0.98); }
      100% { transform: scale(1); }
    }
  `;
  document.head.appendChild(style);
});
