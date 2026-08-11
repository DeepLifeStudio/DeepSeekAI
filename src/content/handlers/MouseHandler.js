
import { selectionManager, isPointInSavedSelection } from '../components/SelectionManager';
import { popupManager } from '../components/PopupManager';
import { popupStateManager } from '../utils/popupStateManager';
import { createQuickActionButtons } from '../components/QuickActionButtons';

// 全局变量跟踪状态
let isMouseDown = false;
let mouseDownPosition = { x: 0, y: 0 };
let hasMovedEnough = false;
let selectionChangeTimeout = null;
let lastSelectionLength = 0;
let quickActionsVisibleBeforeContextMenu = false;
let quickActionsShownAt = 0; // 记录快捷按钮显示时间
const DOUBLE_CLICK_GUARD_MS = 350; // 双击/三击保护时间窗口
let currentQuickActions = null;

// 判断是否为快速的多击（双击/三击）
function isRapidMultiClick(event) {
  try {
    return event && typeof event.detail === 'number' && event.detail >= 2;
  } catch (_) {
    return false;
  }
}

// 隐藏快捷按钮
export function hideQuickActions() {
  // 兼容旧容器
  const container = document.getElementById('fixed-quick-actions-container');
  if (container) {
    container.style.opacity = '0';
    container.style.pointerEvents = 'none';
    setTimeout(() => { container.innerHTML = ''; }, 200);
  }

  // 新容器
  const wrapper = document.getElementById('quick-actions-wrapper');
  if (wrapper) {
    // 清理滚动监听器
    if (wrapper._scrollHandler) {
      window.removeEventListener('scroll', wrapper._scrollHandler, true);
      delete wrapper._scrollHandler;
    }

    if (wrapper.parentNode) {
      try { wrapper.parentNode.removeChild(wrapper); } catch (_) {}
    }
    if (currentQuickActions === wrapper) currentQuickActions = null;
  }
}

export function removeQuickActions() {
  hideQuickActions();
}

// 查找最近的 Rect
function findRangeRectNearPoint(range, anchorPoint) {
  if (!range || !anchorPoint) return null;

  const rects = Array.from(range.getClientRects()).filter(rect => rect.width || rect.height);
  if (!rects.length) return null;

  const contains = (rect) =>
    anchorPoint.x >= rect.left &&
    anchorPoint.x <= rect.right &&
    anchorPoint.y >= rect.top &&
    anchorPoint.y <= rect.bottom;

  const containingRect = rects.find(contains);
  if (containingRect) return containingRect;

  const closest = rects.reduce((acc, rect) => {
    const dx =
      anchorPoint.x < rect.left
        ? rect.left - anchorPoint.x
        : anchorPoint.x > rect.right
          ? anchorPoint.x - rect.right
          : 0;
    const dy =
      anchorPoint.y < rect.top
        ? rect.top - anchorPoint.y
        : anchorPoint.y > rect.bottom
          ? anchorPoint.y - rect.bottom
          : 0;
    const distance = Math.hypot(dx, dy);
    if (!acc || distance < acc.distance) {
      return { rect, distance };
    }
    return acc;
  }, null);

  return closest ? closest.rect : rects[0];
}

async function handleCopyAction() {
  if (selectionManager.hasSelection()) {
    const textToCopy = selectionManager.getSavedText();
    if (textToCopy) {
      try {
        await navigator.clipboard.writeText(textToCopy);
        removeQuickActions();
        selectionManager.clear();
        try {
          window.getSelection().removeAllRanges();
        } catch (err) { /* silent */ }
      } catch (err) {
        console.error("复制文本失败:", err);
      }
    }
  } else {
    console.log("没有选中的文本可以复制");
  }
}

// 处理快捷按钮操作
function handleQuickAction(action, text) {
  selectionManager.saveSelection();
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;
  const rect = selection.getRangeAt(0).getBoundingClientRect();
  const messages = [ { role: "user", content: text, } ];
  removeQuickActions();
  let prompt = action.prompt;
  if (action.id === 'translate' && !prompt.includes('简体中文')) {
    prompt = action.prompt.replace('{language}', '简体中文');
  }
  if (action.id === 'custom') {
    messages[0].userQuestion = action.prompt;
    prompt = "你是一个帮助用户理解和分析内容的AI助手。用户会提供一段内容以及他们的问题。请基于用户提供的内容回答用户问题。";
  }
  popupManager.handlePopupCreation(text, rect, false, messages, prompt);
  selectionManager.scheduleRestore(50, false);
}

// 显示快捷按钮
function showQuickActionsForSelection(selection, anchorPoint) {
  try {
    // 若在弹窗冷却时间内，禁止唤起快捷栏
    if (Date.now() < popupManager.suppressQuickActionsUntil) {
      return;
    }
    // 若已有一个实例，先移除
    const existed = document.getElementById('quick-actions-wrapper');
    if (existed && existed.parentNode) {
      try { existed.parentNode.removeChild(existed); } catch (_) {}
    }
    selectionManager.saveSelection();

    let wrapper = document.getElementById('quick-actions-wrapper');
    if (!wrapper) {
      wrapper = document.createElement('div');
      wrapper.id = 'quick-actions-wrapper';
      Object.assign(wrapper.style, {
        position: 'fixed',
        zIndex: '2147483647',
        pointerEvents: 'auto',
        opacity: '0',
        transition: 'opacity 0.15s ease',
      });
      document.body.appendChild(wrapper);
      currentQuickActions = wrapper;
    }
    const range = selectionManager.savedRange;
    if (!range) return;
    const boundingRect = range.getBoundingClientRect();
    const anchorRect = anchorPoint ? findRangeRectNearPoint(range, anchorPoint) : null;
    const rect = anchorRect || boundingRect;
    const text = selectionManager.getSavedText();
    wrapper.innerHTML = '';
    wrapper.dataset.manualPosition = 'false';

    // 传入 popupManager.handleIconClick 作为 handleIconClick 回调
    // 注意：content.js 里 handleIconClick 是直接用的，但这里我们需要桥接一下
    // 实际上 createQuickActionButtons 需要一个能处理图标点击的函数
    // 我们可以直接绑定 popupManager.handlePopupCreation 变体，或者复用 popupManager.handleIconClick 如果我们提取了它
    // 这里的 handleIconClick 用于 QuickAction buttons 里的某些交互？
    // 查看 content.js, createQuickActionButtons(text, handleQuickAction, handleIconClick, handleCopyAction)
    // 那个 handleIconClick 实际上是用于当 QuickAction 切换到 Icon 模式？或者类似的
    // 暂时用一个包装函数
    const handleIconClickWrapper = (e, txt, r) => {
        // 模拟 handleIconClick 的行为
        e.stopPropagation();
        e.preventDefault();
        removeQuickActions();
        if (!r) {
            r = {
                left: window.innerWidth / 2,
                top: window.innerHeight / 2 - 190,
                width: 0,
                height: 0
            };
        }
        popupManager.handlePopupCreation(txt || "", r);
    };

    createQuickActionButtons(text, handleQuickAction, handleIconClickWrapper, handleCopyAction)
      .then(buttonsContainer => {
        if (!buttonsContainer) return;

        // 保存初始位置信息
        const initialRect = {
          left: rect.left,
          top: rect.top,
          bottom: rect.bottom
        };
        const initialScroll = {
          x: window.pageXOffset || document.documentElement.scrollLeft,
          y: window.pageYOffset || document.documentElement.scrollTop
        };

        Object.assign(wrapper.style, {
          left: `${rect.left}px`,
          top: `${rect.bottom + 5}px`,
          zIndex: '2147483646'
        });

        buttonsContainer.style.position = 'static';
        wrapper.appendChild(buttonsContainer);

        requestAnimationFrame(() => {
          try {
            const containerRect = buttonsContainer.getBoundingClientRect();
            const padding = 8;
            const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
            let clampedLeft = initialRect.left;
            const maxLeft = viewportWidth - containerRect.width - padding;
            if (clampedLeft > maxLeft) clampedLeft = Math.max(padding, maxLeft);
            if (clampedLeft < padding) clampedLeft = padding;

            if (clampedLeft !== initialRect.left) {
              initialRect.left = clampedLeft;
              wrapper.style.left = `${clampedLeft}px`;
            }
          } catch (_) {}

          wrapper.style.opacity = '1';
        });

        quickActionsShownAt = Date.now();

        const handleScroll = () => {
          if (!wrapper || wrapper.dataset.manualPosition === 'true') {
            return;
          }
          const currentScrollX = window.pageXOffset || document.documentElement.scrollLeft;
          const currentScrollY = window.pageYOffset || document.documentElement.scrollTop;

          const deltaX = currentScrollX - initialScroll.x;
          const deltaY = currentScrollY - initialScroll.y;

          if (wrapper && wrapper.parentNode) {
            wrapper.style.left = `${initialRect.left - deltaX}px`;
            wrapper.style.top = `${initialRect.bottom + 5 - deltaY}px`;
          }
        };

        wrapper._scrollHandler = handleScroll;
        window.addEventListener('scroll', handleScroll, true);

        if (buttonsContainer.initDrag) {
          buttonsContainer.initDrag();
        }
        if (buttonsContainer.initFocus) {
          buttonsContainer.initFocus();
        }
      })
      .catch(err => {
        console.error('创建快捷按钮出错:', err);
      });
  } catch (error) {
    console.error('显示快捷按钮时出错:', error);
  }
}

function getStableSelection(maxWait = 500, settle = 140) {
  return new Promise((resolve) => {
    const start = Date.now();
    let lastText = '';
    let lastChange = Date.now();

    const tick = () => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
        if (Date.now() - start >= maxWait) return resolve(null);
        return setTimeout(tick, 40);
      }

      const text = sel.toString().trim();
      if (text !== lastText) {
        lastText = text;
        lastChange = Date.now();
      }

      if (text && Date.now() - lastChange >= settle) {
        return resolve(sel);
      }

      if (Date.now() - start >= maxWait) {
        return resolve(sel);
      }
      setTimeout(tick, 40);
    };
    tick();
  });
}

function prepareSelectionUI(selection) {
  if (!selection || selection.isCollapsed) return;
  const selectedText = selection.toString().trim();
  if (!selectedText) return;
  // logic only saves text if needed, original code had side effects on lastSelectionText
}

let isHandlingIconClick = false; // local var

export function initMouseHandlers(isSelectionEnabledGetter) {
  // 设置 popupManager 的回调
  popupManager.setCallbacks(removeQuickActions, () => {}); // removeIcon logic inside handler?

  document.addEventListener("mousedown", function(e) {
    if (e.button !== 0) return;

    isMouseDown = true;
    hasMovedEnough = false;
    mouseDownPosition = { x: e.clientX, y: e.clientY };

    if (selectionChangeTimeout) {
      clearTimeout(selectionChangeTimeout);
      selectionChangeTimeout = null;
    }

    if (!e.target.closest('.deepseek-quick-action-buttons, .quick-action-buttons') &&
        !e.target.closest('.custom-prompt-input')) {
      const withinGuardWindow = quickActionsShownAt && (Date.now() - quickActionsShownAt < DOUBLE_CLICK_GUARD_MS);
      if (!isPointInSavedSelection(e) && !withinGuardWindow) {
        removeQuickActions();
      }
    }
  }, { passive: true });

  document.addEventListener("mousemove", function(e) {
    if (!isMouseDown || !isSelectionEnabledGetter() || popupStateManager.isCreating()) return;

    const dx = e.clientX - mouseDownPosition.x;
    const dy = e.clientY - mouseDownPosition.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 5) {
      hasMovedEnough = true;
      const selection = window.getSelection();
      const selectionLength = selection ? selection.toString().trim().length : 0;

      if (selectionLength > 0 && selectionLength !== lastSelectionLength) {
        lastSelectionLength = selectionLength;
        if (selectionChangeTimeout) {
          clearTimeout(selectionChangeTimeout);
        }
        selectionChangeTimeout = setTimeout(() => {
          if (isMouseDown && selectionLength > 0) {
            prepareSelectionUI(selection);
          }
        }, 50);
      }
    }
  }, { passive: true });

  document.addEventListener("mouseup", function(e) {
    isMouseDown = false;
    if (e.button === 2) return;
    if (!isSelectionEnabledGetter() || popupStateManager.isCreating() || isHandlingIconClick) return;

    if (e.target.closest && e.target.closest('.deepseek-quick-action-buttons, .quick-action-buttons')) return;

    const anchorPoint = { x: e.clientX, y: e.clientY };
    if (!hasMovedEnough && e.detail >= 2) {
      getStableSelection(550, 160).then((sel) => {
        if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
        const textNow = sel.toString().trim();
        if (!textNow) return;
        selectionManager.saveSelection();
        if (!selectionManager.hasSelection()) return;
        showQuickActionsForSelection(sel, anchorPoint);
      });
      return;
    }

    const delay = hasMovedEnough ? 10 : 180;
    setTimeout(() => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
      const textNow = sel.toString().trim();
      if (!textNow) return;
      selectionManager.saveSelection();
      if (!selectionManager.hasSelection()) return;
      showQuickActionsForSelection(sel, anchorPoint);
    }, delay);
  }, { passive: true });

  // Context Menu
  document.addEventListener("contextmenu", function(event) {
    const targetElement = event.target;
    // ... logic (similar to original)
    const isOnQuickActions = targetElement.closest && targetElement.closest('.deepseek-quick-action-buttons, .quick-action-buttons');
    if (isOnQuickActions) return;

    if (selectionManager.hasSelection()) {
        selectionManager.restoreSelection(true);
    }
  }, { capture: true });

  // Capture mousedown
  document.addEventListener("mousedown", function(e) {
      if (isHandlingIconClick) return;
      const targetElement = e.target;
      const isOnQuickActions = targetElement.closest && targetElement.closest('.deepseek-quick-action-buttons, .quick-action-buttons');
      const isOnInput = targetElement.closest && (targetElement.tagName === 'INPUT' || targetElement.tagName === 'TEXTAREA') && isOnQuickActions;

      if (isOnQuickActions) {
        if (e.button === 2) return;
        if (isOnInput) {
            selectionManager.saveSelection();
        } else {
            selectionManager.saveSelection();
        }
        return;
      }

      if (e.button === 2) return; // Right click outside

      if (e.button === 0) {
        if (isPointInSavedSelection(e)) return;
        const withinGuardWindow = quickActionsShownAt && (Date.now() - quickActionsShownAt < DOUBLE_CLICK_GUARD_MS);
        if (!withinGuardWindow) {
            removeQuickActions();
            if (selectionManager.hasSelection()) {
                selectionManager.clear();
                try { window.getSelection().removeAllRanges(); } catch (err) {}
            }
        }
      }

      // Hack for right click focus preservation (skipped for now or simplified)
  }, { capture: true, passive: false });

  // 点击聊天窗口外部时收起窗口，但保留完整会话。
  // 使用 click 阶段，避免网页自身的 mousedown/选区处理打断恢复图标创建。
  document.addEventListener('click', (event) => {
    const currentPopup = popupManager.currentPopup;
    if (!currentPopup || popupStateManager.isMinimized()) return;
    if (currentPopup._isTempPinned) return;

    const composedPath = event.composedPath ? event.composedPath() : [];
    if (composedPath.includes(currentPopup)) return;

    const shadowHost = document.getElementById('deepseek-shadow-host');
    if (event.target === shadowHost) return;

    popupManager.minimizePopup();
  });


  // Short cuts
  document.addEventListener('keydown', (e) => {
    if (!popupManager.currentPopup) return;
    if (e.key === 'Escape' && !e.defaultPrevented && !popupStateManager.isMinimized()) {
        e.preventDefault();
        popupManager.minimizePopup();
    }
  });

  // Close QD on outside click
  document.addEventListener('mousedown', (e) => {
      const wrapper = document.getElementById('quick-actions-wrapper');
      if (!wrapper) return;
      if (e.target.closest && e.target.closest('.deepseek-quick-action-buttons, .quick-action-buttons')) return;
      hideQuickActions();
  }, { passive: true });


    // Copy listeners
    document.addEventListener('copy', function(event) {
        if (selectionManager.hasSelection()) {
            const currentSelection = window.getSelection();
            if (!currentSelection || currentSelection.isCollapsed || !currentSelection.toString().trim()) {
                selectionManager.restoreSelection(true);
            }
        }
    }, { capture: true });

    document.addEventListener('keydown', function(event) {
        const isCopyShortcut = (event.ctrlKey || event.metaKey) && event.key === 'c';
        if (isCopyShortcut && selectionManager.hasSelection()) {
            const currentSelection = window.getSelection();
            if (!currentSelection || currentSelection.isCollapsed || !currentSelection.toString().trim()) {
                selectionManager.restoreSelection(true);
            }
        }
    }, { capture: true });
}

// Fixed container init
document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('fixed-quick-actions-container')) {
        const container = document.createElement('div');
        container.id = 'fixed-quick-actions-container';
        Object.assign(container.style, {
            position: 'absolute',
            pointerEvents: 'none',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            zIndex: '2147483646',
            opacity: '0',
            transition: 'opacity 0.2s ease'
        });
        document.body.appendChild(container);
    }
});
