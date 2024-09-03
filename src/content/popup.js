import PerfectScrollbar from "perfect-scrollbar";
import { createSvgIcon } from "./icon";
import { dragMoveListener, resizeMoveListener } from "./drag";
import interact from "interactjs";
import { getAIResponse } from "./api";
import { setAllowAutoScroll, updateAllowAutoScroll } from "./scrollControl";

export function createPopup(text, rect) {
  const popup = document.createElement("div");

  stylePopup(popup, rect);
  const aiResponseElement = document.createElement("div");
  const aiResponseContainer = document.createElement("div");
  styleResponseContainer(aiResponseContainer);
  aiResponseElement.id = "ai-response";
  aiResponseElement.style.padding = "10px 30px 0";
  aiResponseElement.style.fontSize = "16px";
  aiResponseContainer.style.paddingBottom = "10px";
  const iconContainer = document.createElement("div");
  iconContainer.className = "icon-wrapper";
  Object.assign(iconContainer.style, {
    gap: "10px",
    position: "relative",
    display: "none",
  });
  const copyIcon = createSvgIcon("copy", "复制");
  const refreshIcon = createSvgIcon("redo", "重答");

  copyIcon.addEventListener("click", () => {
    const aiResponse = document.getElementById("ai-response");
    const tempElement = document.createElement("div");
    tempElement.innerHTML = aiResponse.innerHTML;
    const iconContainer = tempElement.querySelector(".icon-wrapper");
    if (iconContainer) {
      iconContainer.remove();
    }

    const textToCopy = tempElement.innerText;
    navigator.clipboard.writeText(textToCopy);
  });

  iconContainer.appendChild(copyIcon);
  iconContainer.appendChild(refreshIcon);

  aiResponseContainer.appendChild(aiResponseElement);
  aiResponseElement.addEventListener("mouseenter", () => {
    if (iconContainer.dataset.ready === "true") {
      iconContainer.style.display = "flex";
    }
  });

  aiResponseElement.addEventListener("mouseleave", () => {
    if (iconContainer.dataset.ready === "true") {
      iconContainer.style.display = "none";
    }
  });

  popup.appendChild(aiResponseContainer);
  const ps = new PerfectScrollbar(aiResponseContainer, {
    suppressScrollX: true,
    wheelPropagation: false,
  });

  document.body.appendChild(popup);

  let abortController = new AbortController();
  getAIResponse(
    text,
    aiResponseElement,
    abortController.signal,
    ps,
    iconContainer,
    aiResponseContainer
  );

  refreshIcon.addEventListener("click", (event) => {
    event.stopPropagation();
    const aiResponseElement = document.getElementById("ai-response");
    abortController.abort();
    abortController = new AbortController();
    getAIResponse(
      text,
      aiResponseElement,
      abortController.signal,
      ps,
      iconContainer,
      aiResponseContainer
    );
  });

  aiResponseContainer.addEventListener("wheel", () => {
    setAllowAutoScroll(false);
    updateAllowAutoScroll(aiResponseContainer);
  });

  const dragHandle = createDragHandle();
  popup.appendChild(dragHandle);

  interact(dragHandle).draggable({
    inertia: true,
    modifiers: [
      interact.modifiers.restrictRect({ restriction: "body", endOnly: true }),
    ],
    listeners: { move: dragMoveListener },
  });

  interact(popup)
    .resizable({
      edges: { left: true, right: true, bottom: true, top: true },
      modifiers: [
        interact.modifiers.restrictSize({
          min: { width: 100, height: 100 },
          max: { width: 600, height: 600 },
        }),
      ],
      listeners: { move: resizeMoveListener },
    })
    .ignoreFrom(".ps__rail-y");
}

export function stylePopup(popup, rect) {
  popup.id = "ai-popup";
  Object.assign(popup.style, {
    position: "absolute",
    width: "580px",
    height: "380px",
    paddingTop: "20px",
    backgroundColor: "#f6f6f6a8",
    boxShadow: "0 0 1px #0009, 0 0 2px #0000000d, 0 38px 90px #00000040",
    backdropFilter: "blur(10px)",
    borderRadius: "12px",
    zIndex: "1000",
    fontFamily: "Arial, sans-serif",
    overflow: "auto",
  });

  const { adjustedX, adjustedY } = adjustPopupPosition(rect, popup);
  popup.style.left = `${adjustedX}px`;
  popup.style.top = `${adjustedY}px`;
}

export function styleResponseContainer(container) {
  Object.assign(container.style, {
    position: "relative",
    width: "100%",
    height: "calc(100% - 40px)",
    marginTop: "20px",
    overflow: "auto",
  });
  container.id = "ai-response-container";
}

function adjustPopupPosition(rect, popup) {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const scrollX = window.scrollX || window.pageXOffset;
  const scrollY = window.scrollY || window.pageYOffset;
  const popupWidth = parseInt(popup.style.width, 10);
  const popupHeight = parseInt(popup.style.height, 10);

  let adjustedX = rect.left + scrollX + rect.width / 2 - popupWidth / 2;
  let adjustedY = rect.top + scrollY + rect.height;

  if (adjustedY + popupHeight > viewportHeight + scrollY) {
    adjustedY = rect.top + scrollY - popupHeight;
  }

  adjustedX = Math.max(
    scrollX,
    Math.min(adjustedX, viewportWidth + scrollX - popupWidth)
  );
  adjustedY = Math.max(
    scrollY,
    Math.min(adjustedY, viewportHeight + scrollY - popupHeight)
  );

  return { adjustedX, adjustedY };
}

function createDragHandle() {
  const dragHandle = document.createElement("div");
  Object.assign(dragHandle.style, {
    position: "absolute",
    top: "0",
    left: "0",
    width: "100%",
    height: "40px",
    backgroundColor: "#F2F2F7",
    cursor: "move",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0 10px",
    boxSizing: "border-box",
  });

  const titleContainer = document.createElement("div");
  titleContainer.style.display = "flex";
  titleContainer.style.alignItems = "center";

  const logo = document.createElement("img");
  logo.src = chrome.runtime.getURL("icons/icon24.png");
  logo.style.height = "24px";
  logo.style.marginRight = "10px";

  const textNode = document.createTextNode("DeepSeek AI");
  titleContainer.appendChild(logo);
  titleContainer.appendChild(textNode);

  const closeButton = document.createElement("button");
  Object.assign(closeButton.style, {
    display: "none",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "0",
    transition: "all 0.2s ease",
    position: "absolute",
    right: "10px",
  });

  const closeIcon = document.createElement("img");
  closeIcon.src = chrome.runtime.getURL("icons/close.svg");
  closeIcon.style.width = "20px";
  closeIcon.style.height = "20px";

  closeButton.appendChild(closeIcon);

  dragHandle.appendChild(titleContainer);
  dragHandle.appendChild(closeButton);

  dragHandle.addEventListener("mouseenter", () => {
    closeButton.style.display = "block";
  });

  dragHandle.addEventListener("mouseleave", () => {
    closeButton.style.display = "none";
    // 重置关闭按钮状态
    closeIcon.src = chrome.runtime.getURL("icons/close.svg");
    closeButton.style.transform = "scale(1)";
  });

  closeButton.addEventListener("mouseenter", () => {
    closeIcon.src = chrome.runtime.getURL("icons/closeClicked.svg");
    closeButton.style.transform = "scale(1.1)";
  });

  closeButton.addEventListener("mouseleave", () => {
    closeIcon.src = chrome.runtime.getURL("icons/close.svg");
    closeButton.style.transform = "scale(1)";
  });

  closeButton.addEventListener("click", (event) => {
    event.stopPropagation();

    setTimeout(() => {
      const popup = document.getElementById("ai-popup");
      if (popup) {
        document.body.removeChild(popup);
      }
    }, 200);
  });

  return dragHandle;
}
