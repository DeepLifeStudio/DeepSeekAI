export function initDraggable(dragHandle, popup) {
  let isDragging = false;
  let startX, startY;
  let initialX, initialY;

  dragHandle.addEventListener('mousedown', startDragging);
  document.addEventListener('mousemove', drag);
  document.addEventListener('mouseup', stopDragging);

  function startDragging(e) {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    initialX = popup.offsetLeft;
    initialY = popup.offsetTop;
    popup.style.transition = 'none';

    // 添加拖拽状态样式，提供更好的视觉反馈
    popup.classList.add('dragging');
    // 改变光标样式
    dragHandle.style.cursor = 'grabbing';

    // 添加拖拽开始的触感反馈
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  }

  function drag(e) {
    if (!isDragging) return;

    e.preventDefault();
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    // 添加拖拽的惯性和流畅感
    popup.style.left = `${initialX + dx}px`;
    popup.style.top = `${initialY + dy}px`;

    // 更新窗口位置时显示距离指示器（仅当移动足够距离时）
    const moveDistance = Math.sqrt(dx * dx + dy * dy);
    if (moveDistance > 50) {
      // 显示拖拽距离指示器
      showDragDistance(popup, moveDistance.toFixed(0));
    }
  }

  function stopDragging() {
    if (!isDragging) return;

    isDragging = false;
    popup.style.transition = 'transform 0.05s cubic-bezier(0.4, 0, 0.2, 1)';

    // 移除拖拽状态样式
    popup.classList.remove('dragging');
    // 恢复光标样式
    dragHandle.style.cursor = 'grab';

    // 移除拖拽距离指示器
    const distanceIndicator = popup.querySelector('.drag-distance');
    if (distanceIndicator) {
      distanceIndicator.remove();
    }

    // 添加"放置"的触感反馈
    if ('vibrate' in navigator) {
      navigator.vibrate(5);
    }

    // 添加放置动画效果
    popup.classList.add('drag-placed');
    setTimeout(() => {
      popup.classList.remove('drag-placed');
    }, 150);
  }

  // 显示拖拽距离指示器
  function showDragDistance(popup, distance) {
    let distanceIndicator = popup.querySelector('.drag-distance');

    if (!distanceIndicator) {
      distanceIndicator = document.createElement('div');
      distanceIndicator.className = 'drag-distance';
      distanceIndicator.style.position = 'absolute';
      distanceIndicator.style.bottom = '-25px';
      distanceIndicator.style.left = '50%';
      distanceIndicator.style.transform = 'translateX(-50%)';
      distanceIndicator.style.backgroundColor = 'var(--bg-secondary)';
      distanceIndicator.style.color = 'var(--text-secondary)';
      distanceIndicator.style.padding = '4px 8px';
      distanceIndicator.style.borderRadius = '4px';
      distanceIndicator.style.fontSize = '10px';
      distanceIndicator.style.pointerEvents = 'none';
      distanceIndicator.style.zIndex = '2000';
      distanceIndicator.style.opacity = '0.9';
      distanceIndicator.style.boxShadow = 'var(--shadow-sm)';
      popup.appendChild(distanceIndicator);
    }

    distanceIndicator.textContent = `已移动 ${distance}px`;
  }

  return () => {
    dragHandle.removeEventListener('mousedown', startDragging);
    document.removeEventListener('mousemove', drag);
    document.removeEventListener('mouseup', stopDragging);
  };
}

export function resizeMoveListener(event) {
  const { target, rect } = event;

  Object.assign(target.style, {
    width: `${rect.width}px`,
    height: `${rect.height}px`
  });

  if (event.edges.left) {
    target.style.left = `${rect.left}px`;
  }
  if (event.edges.top) {
    target.style.top = `${rect.top}px`;
  }
}

export function createDragHandle(removeCallback, minimizeCallback, pinCallback) {
  const dragHandle = document.createElement("div");
  Object.assign(dragHandle.style, {
    position: "absolute",
    top: "0",
    left: "0",
    width: "100%",
    height: "40px",
    cursor: "grab", // 改为grab光标，更符合拖拽操作的直觉
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0 10px",
    boxSizing: "border-box",
  });

  dragHandle.classList.add('drag-handle');

  // 临时固定状态（仅对当前窗口有效）
  let isTempPinned = false;

  const titleContainer = document.createElement("div");
  Object.assign(titleContainer.style, {
    display: "flex",
    alignItems: "center",
    userSelect: "none",
    WebkitUserSelect: "none",
    pointerEvents: "none"
  });

  const logo = document.createElement("img");
  logo.src = chrome.runtime.getURL("icons/icon24.png");
  Object.assign(logo.style, {
    height: "24px",
    marginRight: "10px",
    userSelect: "none",
    WebkitUserSelect: "none",
    pointerEvents: "none",
    WebkitUserDrag: "none",
    WebkitAppRegion: "no-drag",
    draggable: false
  });
  logo.setAttribute("draggable", "false");

  const textNode = document.createElement("span");
  Object.assign(textNode.style, {
    fontWeight: "bold",
    userSelect: "none",
    WebkitUserSelect: "none",
    pointerEvents: "none"
  });
  textNode.textContent = "DeepSeek AI";
  titleContainer.appendChild(logo);
  titleContainer.appendChild(textNode);

  // 添加拖拽提示
  const dragTooltip = document.createElement("div");
  dragTooltip.className = "tool-tip";
  dragTooltip.textContent = "Drag to move the window";
  dragTooltip.style.top = "45px";
  dragTooltip.style.left = "50%";
  dragTooltip.style.transform = "translateX(-50%)";
  dragHandle.appendChild(dragTooltip);

  const closeButton = document.createElement("button");
  closeButton.className = "close-button tooltip-trigger";
  closeButton.type = "button";
  closeButton.setAttribute("aria-label", "Close chat");
  Object.assign(closeButton.style, {
    display: "none",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "8px",
    margin: "0",
    transition: "all 0.2s cubic-bezier(0.25, 1, 0.5, 1)",
    position: "absolute",
    right: "10px",
    top: "50%",
    transform: "translateY(-50%) scale(1)",
    width: "24px",
    height: "24px",
    minWidth: "24px",
    minHeight: "24px",
    maxWidth: "24px",
    maxHeight: "24px",
    lineHeight: "1",
    outline: "none",
    boxSizing: "content-box",
    zIndex: "10",
    appearance: "none",
    WebkitAppearance: "none",
    MozAppearance: "none",
    borderRadius: "6px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  });

  const closeIcon = document.createElement("div");
  closeIcon.className = "close-icon";
  // 使用内联 SVG，与其他按钮风格统一
  closeIcon.innerHTML = `
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block">
      <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `;

  // 简化图标样式
  Object.assign(closeIcon.style, {
    width: "16px",
    height: "16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    color: "var(--text-secondary)",
    transition: "transform 0.15s ease, color 0.15s ease",
    padding: "0",
    zIndex: "10"
  });

  closeButton.appendChild(closeIcon);

  closeButton.addEventListener("mouseenter", () => {
    // 悬停时变为苹果蓝色并轻微放大
    closeIcon.style.transform = "scale(1.1)";
    closeIcon.style.color = "var(--accent-color, #007aff)";
  });

  closeButton.addEventListener("mouseleave", () => {
    // 恢复正常状态
    closeIcon.style.transform = "scale(1)";
    closeIcon.style.color = "var(--text-secondary)";
  });

  closeButton.addEventListener("mousedown", (e) => {
    e.stopPropagation();
    // 点击时只放大图标而不是整个按钮
    closeIcon.style.transform = "scale(1.2)";

    // 强制按钮保持在原位置
    closeButton.style.transform = "translateY(-50%)";
    closeButton.style.top = "50%";

    // 触觉反馈
    if ('vibrate' in navigator) {
      navigator.vibrate(8);
    }
  });

  closeButton.addEventListener("mouseup", () => {
    // 恢复到悬停状态，按钮保持位置不变
    closeIcon.style.transform = "scale(1.1)";
    closeButton.style.transform = "translateY(-50%)";
  });

  closeButton.addEventListener("click", (e) => {
    e.stopPropagation();
    e.preventDefault(); // 防止默认行为

    // 强制按钮保持在原位置
    closeButton.style.transform = "translateY(-50%)";
    closeButton.style.transition = "none";

    // 确保图标不会发生变形
    closeIcon.style.transition = "none";
    closeIcon.style.transform = "scale(1)";

    // 立即执行关闭回调，不添加任何额外效果
    if (removeCallback) {
      removeCallback();
    }
  });

  // 最小化按钮（在关闭按钮左侧）
  const minimizeButton = document.createElement("button");
  minimizeButton.className = "minimize-button tooltip-trigger";
  minimizeButton.type = "button";
  minimizeButton.setAttribute("aria-label", "Minimize chat");
  Object.assign(minimizeButton.style, {
    display: "none",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "8px",
    margin: "0",
    transition: "all 0.2s cubic-bezier(0.25, 1, 0.5, 1)",
    position: "absolute",
    right: "42px",
    top: "50%",
    transform: "translateY(-50%) scale(1)",
    width: "24px",
    height: "24px",
    minWidth: "24px",
    minHeight: "24px",
    maxWidth: "24px",
    maxHeight: "24px",
    lineHeight: "1",
    outline: "none",
    boxSizing: "content-box",
    zIndex: "10",
    appearance: "none",
    WebkitAppearance: "none",
    MozAppearance: "none",
    borderRadius: "6px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  });

  const minimizeIcon = document.createElement("div");
  minimizeIcon.className = "minimize-icon";
  minimizeIcon.innerHTML = `
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block">
      <path d="M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    </svg>
  `;
  Object.assign(minimizeIcon.style, {
    width: "16px",
    height: "16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    color: "var(--text-secondary)",
    transition: "transform 0.15s ease, color 0.15s ease",
    padding: "0",
    zIndex: "10"
  });
  minimizeButton.appendChild(minimizeIcon);

  minimizeButton.addEventListener("mouseenter", () => {
    minimizeIcon.style.transform = "scale(1.1)";
    minimizeIcon.style.color = "var(--accent-color, #007aff)";
  });
  minimizeButton.addEventListener("mouseleave", () => {
    minimizeIcon.style.transform = "scale(1)";
    minimizeIcon.style.color = "var(--text-secondary)";
  });
  minimizeButton.addEventListener("mousedown", (e) => {
    e.stopPropagation();
    minimizeIcon.style.transform = "scale(1.2)";
    minimizeButton.style.transform = "translateY(-50%)";
    minimizeButton.style.top = "50%";
    if ('vibrate' in navigator) navigator.vibrate(8);
  });
  minimizeButton.addEventListener("mouseup", () => {
    minimizeIcon.style.transform = "scale(1.1)";
    minimizeButton.style.transform = "translateY(-50%)";
  });
  minimizeButton.addEventListener("click", (e) => {
    e.stopPropagation();
    e.preventDefault();
    minimizeButton.style.transform = "translateY(-50%)";
    minimizeIcon.style.transform = "scale(1)";
    if (typeof minimizeCallback === 'function') {
      minimizeCallback();
    }
  });

  // 复制所有对话按钮（在最小化按钮左侧，固定按钮右侧，或者根据新的布局调整）
  // 布局顺序：Copy -> Pin -> Minimize -> Close
  // Close: right 10px
  // Minimize: right 42px
  // Pin: right 74px
  // Copy: right 106px

  const copyButton = document.createElement("button");
  copyButton.className = "copy-all-button tooltip-trigger";
  copyButton.type = "button";
  copyButton.setAttribute("aria-label", "Copy conversation");
  Object.assign(copyButton.style, {
    display: "none",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "8px",
    margin: "0",
    transition: "all 0.2s cubic-bezier(0.25, 1, 0.5, 1)",
    position: "absolute",
    right: "106px", // Pin按钮左侧
    top: "50%",
    transform: "translateY(-50%) scale(1)",
    width: "24px",
    height: "24px",
    minWidth: "24px",
    minHeight: "24px",
    maxWidth: "24px",
    maxHeight: "24px",
    lineHeight: "1",
    outline: "none",
    boxSizing: "content-box",
    zIndex: "10",
    appearance: "none",
    WebkitAppearance: "none",
    MozAppearance: "none",
    borderRadius: "6px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  });

  const copyIcon = document.createElement("div");
  copyIcon.className = "copy-all-icon";
  // 使用与 IconManager.js 中一致的 Copy 图标 SVG
  const copySvgContent = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block"><path d="M8 4V16C8 17.1046 8.89543 18 10 18H18C19.1046 18 20 17.1046 20 16V7.24264C20 6.71221 19.7893 6.20357 19.4142 5.82843L16.1716 2.58579C15.7964 2.21071 15.2878 2 14.7574 2H10C8.89543 2 8 2.89543 8 4Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 18V20C16 21.1046 15.1046 22 14 22H6C4.89543 22 4 21.1046 4 20V8C4 6.89543 4.89543 6 6 6H8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

  copyIcon.innerHTML = copySvgContent;

  Object.assign(copyIcon.style, {
    width: "16px",
    height: "16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    color: "var(--text-secondary)",
    transition: "transform 0.15s ease, color 0.15s ease",
    padding: "0",
    zIndex: "10"
  });
  copyButton.appendChild(copyIcon);

  // 添加工具提示
  const copyTooltip = document.createElement('div');
  copyTooltip.className = 'tool-tip';
  copyTooltip.textContent = 'Copy entire conversation';
  copyTooltip.style.top = '35px';
  copyTooltip.style.right = '-20px';
  copyTooltip.style.width = 'max-content';
  copyButton.appendChild(copyTooltip);

  copyButton.addEventListener("mouseenter", () => {
    copyIcon.style.transform = "scale(1.1)";
    copyIcon.style.color = "var(--accent-color, #007aff)";
  });

  copyButton.addEventListener("mouseleave", () => {
    copyIcon.style.transform = "scale(1)";
    copyIcon.style.color = "var(--text-secondary)";
  });

  copyButton.addEventListener("mousedown", (e) => {
    e.stopPropagation();
    copyIcon.style.transform = "scale(1.2)";
    copyButton.style.transform = "translateY(-50%)";
    copyButton.style.top = "50%"; // 确保位置
    if ('vibrate' in navigator) navigator.vibrate(8);
  });

  copyButton.addEventListener("mouseup", () => {
    copyIcon.style.transform = "scale(1.1)";
    copyButton.style.transform = "translateY(-50%)";
  });

  copyButton.addEventListener("click", (e) => {
    e.stopPropagation();
    e.preventDefault();

    copyButton.style.transform = "translateY(-50%)";

    // 获取对话内容逻辑
    const aiResponseContainer = window.aiResponseContainer;
    if (!aiResponseContainer) return;

    // 收集所有对话
    const userQuestions = aiResponseContainer.querySelectorAll('.user-question');
    const aiAnswers = aiResponseContainer.querySelectorAll('.ai-answer');

    let conversationText = '';

    // 假设问答是一一对应的，或者是交替的
    // 更稳健的方法是按文档顺序遍历
    const allMessages = aiResponseContainer.querySelectorAll('.user-question, .ai-answer');

    allMessages.forEach(msg => {
      const isUser = msg.classList.contains('user-question');
      // 提取文本，移除图标容器等干扰内容
      const cleanText = Array.from(msg.childNodes)
        .filter(node => {
          return (!node.classList ||
                 (!node.classList.contains('icon-container') &&
                  !node.classList.contains('reasoning-content')));
        })
        .map(node => node.textContent)
        .join('')
        .trim();

      if (cleanText) {
        conversationText += `${isUser ? 'User' : 'DeepSeek'}: ${cleanText}\n\n`;
      }
    });

    if (conversationText) {
      navigator.clipboard.writeText(conversationText).then(() => {
        // 成功反馈
        // 切换为绿色对号图标
        copyIcon.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block"><path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
        copyIcon.style.color = "var(--success-color, #34c759)";
        copyIcon.style.transform = "scale(1.25)";

        if ('vibrate' in navigator) navigator.vibrate([10, 50, 10]);

        setTimeout(() => {
          copyIcon.style.transform = "scale(1)";
          // 恢复原始图标
          copyIcon.innerHTML = copySvgContent;
          copyIcon.style.color = "var(--text-secondary)";
          // 恢复 hover 状态（如果鼠标还在上面的话）
          if (copyButton.matches(':hover')) {
             copyIcon.style.color = "var(--accent-color, #007aff)";
          }
        }, 1500);
      });
    }
  });


  // 固定按钮（在最小化按钮左侧）
  const pinButton = document.createElement("button");
  pinButton.className = "pin-button tooltip-trigger";
  pinButton.type = "button";
  pinButton.setAttribute("aria-label", "Pin chat");
  Object.assign(pinButton.style, {
    display: "none",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "8px",
    margin: "0",
    transition: "all 0.2s cubic-bezier(0.25, 1, 0.5, 1)",
    position: "absolute",
    right: "74px", // 在最小化按钮（42px）左边
    top: "50%",
    transform: "translateY(-50%) scale(1)",
    width: "24px",
    height: "24px",
    minWidth: "24px",
    minHeight: "24px",
    maxWidth: "24px",
    maxHeight: "24px",
    lineHeight: "1",
    outline: "none",
    boxSizing: "content-box",
    zIndex: "10",
    appearance: "none",
    WebkitAppearance: "none",
    MozAppearance: "none",
    borderRadius: "6px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  });

  const pinIcon = document.createElement("div");
  pinIcon.className = "pin-icon";
  // 图钉 SVG 图标，与其他按钮风格一致
  pinIcon.innerHTML = `
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block">
      <path d="M16 4v4l2 2v2h-5v7l-1 1-1-1v-7H6v-2l2-2V4h8z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `;
  Object.assign(pinIcon.style, {
    width: "16px",
    height: "16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    color: "var(--text-secondary)",
    transition: "transform 0.15s ease, color 0.15s ease",
    padding: "0",
    zIndex: "10"
  });
  pinButton.appendChild(pinIcon);

  // 更新固定按钮图标状态
  const updatePinIcon = (isPinned) => {
    if (isPinned) {
      pinIcon.innerHTML = `
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block">
          <path d="M16 4v4l2 2v2h-5v7l-1 1-1-1v-7H6v-2l2-2V4h8z" fill="currentColor" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      `;
      pinIcon.style.color = "var(--accent-color, #007aff)";
    } else {
      pinIcon.innerHTML = `
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block">
          <path d="M16 4v4l2 2v2h-5v7l-1 1-1-1v-7H6v-2l2-2V4h8z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      `;
      pinIcon.style.color = "var(--text-secondary)";
    }
  };

  pinButton.addEventListener("mouseenter", () => {
    pinIcon.style.transform = "scale(1.1)";
    if (!isTempPinned) {
      pinIcon.style.color = "var(--accent-color, #007aff)";
    }
  });
  pinButton.addEventListener("mouseleave", () => {
    pinIcon.style.transform = "scale(1)";
    if (!isTempPinned) {
      pinIcon.style.color = "var(--text-secondary)";
    }
  });
  pinButton.addEventListener("mousedown", (e) => {
    e.stopPropagation();
    pinIcon.style.transform = "scale(1.2)";
    pinButton.style.transform = "translateY(-50%)";
    pinButton.style.top = "50%";
    if ('vibrate' in navigator) navigator.vibrate(8);
  });
  pinButton.addEventListener("mouseup", () => {
    pinIcon.style.transform = "scale(1.1)";
    pinButton.style.transform = "translateY(-50%)";
  });
  pinButton.addEventListener("click", (e) => {
    e.stopPropagation();
    e.preventDefault();

    pinButton.style.transform = "translateY(-50%)";
    pinIcon.style.transform = "scale(1)";

    // 切换临时固定状态
    isTempPinned = !isTempPinned;
    updatePinIcon(isTempPinned);

    // 调用回调函数通知状态变化
    if (typeof pinCallback === 'function') {
      pinCallback(isTempPinned);
    }
  });

  dragHandle.addEventListener("mouseenter", () => {
    closeButton.style.display = "flex";
    minimizeButton.style.display = "flex";
    pinButton.style.display = "flex";
    copyButton.style.display = "flex";
  });

  dragHandle.addEventListener("mouseleave", () => {
    closeButton.style.display = "none";
    minimizeButton.style.display = "none";
    pinButton.style.display = "none";
    copyButton.style.display = "none";
  });

  dragHandle.appendChild(titleContainer);
  dragHandle.appendChild(closeButton);
  dragHandle.appendChild(minimizeButton);
  dragHandle.appendChild(pinButton);
  dragHandle.appendChild(copyButton);

  return dragHandle;
}
