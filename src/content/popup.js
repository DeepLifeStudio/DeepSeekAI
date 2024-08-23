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
    aiResponseContainer,
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
      aiResponseContainer,
    );
  });

  aiResponseContainer.addEventListener("wheel", () => {
    setAllowAutoScroll(false);
    updateAllowAutoScroll(aiResponseContainer);
  });

  const clickOutsideHandler = (e) => {
    if (!popup.contains(e.target)) {
      document.body.removeChild(popup);
      document.removeEventListener("click", clickOutsideHandler);
      abortController.abort();
    }
  };

  setTimeout(() => {
    document.addEventListener("click", clickOutsideHandler);
  }, 0);

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
  popup.style.position = "absolute";
  popup.style.width = "580px";
  popup.style.height = "380px";
  popup.style.paddingTop = "20px";
  popup.style.backgroundColor = "#f6f6f6a8";
  popup.style.boxShadow =
    "0 0 1px #0009,0 0 2px #0000000d,0 38px 90px #00000040";
  popup.style.backdropFilter = "blur(10px)";
  popup.style.borderRadius = "12px";
  popup.style.zIndex = "1000";
  popup.style.fontFamily = "Arial, sans-serif";
  popup.style.overflow = "auto";

  const { adjustedX, adjustedY } = adjustPopupPosition(rect, popup);
  popup.style.left = `${adjustedX}px`;
  popup.style.top = `${adjustedY}px`;
}

export function styleResponseContainer(container) {
  container.style.position = "relative";
  container.id = "ai-response-container";
  container.style.width = "100%";
  container.style.height = "calc(100% - 40px)";
  container.style.marginTop = "20px";
  container.style.overflow = "auto";
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

  if (adjustedX < scrollX) adjustedX = scrollX;
  if (adjustedX + popupWidth > viewportWidth + scrollX)
    adjustedX = viewportWidth + scrollX - popupWidth;
  if (adjustedY < scrollY) adjustedY = scrollY;
  if (adjustedY + popupHeight > viewportHeight + scrollY)
    adjustedY = viewportHeight + scrollY - popupHeight;

  return { adjustedX, adjustedY };
}

function createDragHandle() {
  const dragHandle = document.createElement("div");
  dragHandle.style.position = "absolute";
  dragHandle.style.top = "0";
  dragHandle.style.left = "0";
  dragHandle.style.width = "100%";
  dragHandle.style.height = "40px";
  dragHandle.style.backgroundColor = "#F2F2F7";
  dragHandle.style.cursor = "move";
  dragHandle.style.display = "flex";
  dragHandle.style.alignItems = "center";
  dragHandle.style.justifyContent = "center";
  dragHandle.style.marginBottom = "10px";
  dragHandle.style.fontWeight = "bold";
  dragHandle.style.color = "#007AFF";
  dragHandle.style.fontSize = "16px";

  const logo = document.createElement("img");
  logo.src = chrome.runtime.getURL("icons/icon24.png");
  logo.style.height = "24px";
  logo.style.marginRight = "10px";

  dragHandle.appendChild(logo);

  const textNode = document.createTextNode("DeepSeek AI");
  dragHandle.appendChild(textNode);

  return dragHandle;
}
