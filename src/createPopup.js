import { OverlayScrollbars } from "overlayscrollbars";
import interact from "interactjs";
import MarkdownIt from "markdown-it";
import hljs from "highlight.js";

function createPopup(text, rect) {
  const popup = document.createElement("div");
  stylePopup(popup, rect);
  const aiResponseElement = document.createElement("div");
  const aiResponseContainer = document.createElement("div");

  styleResponseContainer(aiResponseContainer);
  aiResponseElement.id = "ai-response";
  aiResponseElement.style.padding = "10px 25px 0";
  aiResponseElement.style.fontSize = "16px";
  aiResponseContainer.appendChild(aiResponseElement);
  popup.appendChild(aiResponseContainer);
  OverlayScrollbars(aiResponseContainer, {
    scrollbars: { autoHide: "leave", autoHideDelay: 400, clickScrolling: true },
  });
  document.body.appendChild(popup);
  const abortController = new AbortController();
  getAIResponse(text, aiResponseElement, abortController.signal);
  const clickOutsideHandler = (e) => {
    if (!popup.contains(e.target)) {
      document.body.removeChild(popup);
      document.removeEventListener("click", clickOutsideHandler);
      abortController.abort();
    }
  };

  // 使用 setTimeout 来确保这个监听器不会立即触发
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

  interact(popup).resizable({
    edges: { left: true, right: true, bottom: true, top: true },
    modifiers: [
      interact.modifiers.restrictSize({
        min: { width: 100, height: 100 },
        max: { width: 600, height: 600 },
      }),
    ],
    listeners: { move: resizeMoveListener },
  });
}
export { createPopup };