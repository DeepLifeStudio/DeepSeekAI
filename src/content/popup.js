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
  aiResponseElement.style.padding = "10px 40px 0";
  aiResponseElement.style.fontSize = "14px";
  const initialQuestionElement = document.createElement("div");
  initialQuestionElement.className = "user-question";
  initialQuestionElement.textContent = text;
  addCopyIcon(initialQuestionElement);
  // 添加初始的 AI 回答（先显示"AI正在思考..."）
  const initialAnswerElement = document.createElement("div");
  initialAnswerElement.className = "ai-answer";
  initialAnswerElement.textContent = "AI正在思考...";
  aiResponseElement.appendChild(initialQuestionElement);
  aiResponseElement.appendChild(initialAnswerElement);
  addCopyIcon(initialAnswerElement);
  addRefreshIcon(initialAnswerElement, aiResponseElement);
  aiResponseContainer.style.paddingBottom = "10px";
  const iconContainer = document.createElement("div");
  iconContainer.className = "icon-wrapper";
  Object.assign(iconContainer.style, {
    gap: "10px",
    position: "absolute",
    display: "none",
    bottom: "5px",
    right:"5px"
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
    initialAnswerElement,
    abortController.signal,
    ps,
    iconContainer,
    aiResponseContainer
  );

  function addCopyIcon(element) {
    const copyIcon = document.createElement("img");
    copyIcon.src = chrome.runtime.getURL("icons/copy.svg");
    copyIcon.style.position = "absolute";
    copyIcon.style.top = "5px";
    copyIcon.style.right = "5px";
    copyIcon.style.width = "15px";
    copyIcon.style.height = "15px";
    copyIcon.style.cursor = "pointer";
    copyIcon.style.display = "none"; // 初始隐藏图标

    // 鼠标悬停时显示复制图标
    element.addEventListener("mouseenter", () => {
      copyIcon.style.display = "block";
    });
    element.addEventListener("mouseleave", () => {
      copyIcon.style.display = "none";
    });

    // 点击复制图标时复制内容
    copyIcon.addEventListener("click", () => {
      const textToCopy = element.textContent;
      navigator.clipboard.writeText(textToCopy);
    });

    element.style.position = "relative"; // 使图标在元素内绝对定位
    element.appendChild(copyIcon);
  }
  function addRefreshIcon(answerElement, aiResponseElement) {
    const refreshIcon = document.createElement("img");
    refreshIcon.src = chrome.runtime.getURL("icons/redo.svg");
    refreshIcon.style.position = "absolute";
    refreshIcon.style.top = "5px";
    refreshIcon.style.right = "25px"; // 和复制图标保持距离
    refreshIcon.style.width = "15px";
    refreshIcon.style.height = "15px";
    refreshIcon.style.cursor = "pointer";
    refreshIcon.style.display = "none"; // 初始隐藏图标

    // 只有在最后一个 ai-answer 区域显示重答图标
    answerElement.addEventListener("mouseenter", () => {
      refreshIcon.style.display = "block";
    });
    answerElement.addEventListener("mouseleave", () => {
      refreshIcon.style.display = "none";
    });

    // 点击重答图标时执行重答逻辑
    refreshIcon.addEventListener("click", () => {
      const lastUserQuestion = aiResponseElement.querySelector(
        ".user-question:last-child"
      );
      if (lastUserQuestion) {
        const questionText = lastUserQuestion.textContent;
        answerElement.textContent = "AI正在思考...";
        getAIResponse(
          questionText,
          answerElement,
          new AbortController().signal,
          null,
          null,
          true
        );
      }
    });

    answerElement.style.position = "relative"; // 使图标在元素内绝对定位
    answerElement.appendChild(refreshIcon);
  }
  refreshIcon.addEventListener("click", (event) => {
    event.stopPropagation();
    abortController.abort();
    abortController = new AbortController();

    const aiAnswers = aiResponseElement.getElementsByClassName("ai-answer");
    const lastAiAnswer = aiAnswers[aiAnswers.length - 1];
    let userQuestion = lastAiAnswer.previousElementSibling;
    while (userQuestion && !userQuestion.classList.contains("user-question")) {
      userQuestion = userQuestion.previousElementSibling;
    }

    if (userQuestion && lastAiAnswer) {
      const questionText = userQuestion.textContent;
      lastAiAnswer.textContent = "AI正在思考...";
      getAIResponse(
        questionText,
        lastAiAnswer,
        abortController.signal,
        ps,
        iconContainer,
        aiResponseContainer,
        true
      );
    }
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

  const questionInputContainer =
    createQuestionInputContainer(aiResponseContainer);
  popup.appendChild(questionInputContainer);
}

function createQuestionInputContainer(aiResponseContainer) {
  const container = document.createElement("div");
  Object.assign(container.style, {
    position: "absolute",
    bottom: "8px",
    left: "0",
    width: "100%",
    padding: "0 10px",
    boxSizing: "border-box",
  });

  container.innerHTML = `
    <div class="input-container">
      <textarea class="expandable-textarea" placeholder="输入您的问题..."></textarea>
      <svg class="send-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M22 2L11 13" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>
  `;

  const textarea = container.querySelector(".expandable-textarea");
  const sendIcon = container.querySelector(".send-icon");
  const ps = new PerfectScrollbar(textarea, {
    suppressScrollX: true,
    wheelPropagation: false,
  });
  textarea.addEventListener("input", function () {
    this.style.height = "auto";
    this.style.height = this.scrollHeight + "px";
  });

  textarea.addEventListener("focus", function () {
    this.style.minHeight = "60px";
  });

  textarea.addEventListener("blur", function () {
    if (this.value.trim() === "") {
      this.style.height = "40px";
      this.style.minHeight = "40px";
    }
  });

  function sendQuestion() {
    const question = textarea.value.trim();
    if (question) {
      sendQuestionToAI(question);
      textarea.value = "";
      textarea.style.height = "40px";
      textarea.style.minHeight = "40px";
    }
  }

  textarea.addEventListener("keydown", function (event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendQuestion();
    }
  });

  sendIcon.addEventListener("click", sendQuestion);

  return container;
}

function sendQuestionToAI(question) {
  const aiResponseElement = document.getElementById("ai-response");
  const aiResponseContainer = document.getElementById("ai-response-container");
  const iconContainer = document.querySelector(".icon-wrapper");
  const ps = new PerfectScrollbar(aiResponseContainer, {
    suppressScrollX: true,
    wheelPropagation: false,
  });

  const questionElement = document.createElement("div");
  questionElement.className = "user-question";
  questionElement.textContent = `${question}`;
  aiResponseElement.appendChild(questionElement);

  const answerElement = document.createElement("div");
  answerElement.className = "ai-answer";
  answerElement.textContent = "AI正在思考...";
  aiResponseElement.appendChild(answerElement);

  aiResponseContainer.scrollTop = aiResponseContainer.scrollHeight;

  let abortController = new AbortController();
  getAIResponse(
    question,
    answerElement,
    abortController.signal,
    ps,
    iconContainer,
    aiResponseContainer
  );
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
    overflow: "hidden",
  });

  const { adjustedX, adjustedY } = adjustPopupPosition(rect, popup);
  popup.style.left = `${adjustedX}px`;
  popup.style.top = `${adjustedY}px`;
}

export function styleResponseContainer(container) {
  Object.assign(container.style, {
    position: "relative",
    width: "100%",
    height: "calc(100% - 60px)",
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

  const textNode = document.createElement("span");
  textNode.style.fontWeight = "bold";
  textNode.textContent = "DeepSeek AI";
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

const styles = `

  #ai-response{
    display: flex;
    flex-direction: column;
    gap:10px;
  }

  .ai-answer{
    align-self: flex-start;
    background-color: #f0f0f0c9;
    border-radius: 15px;
    padding: 8px 10px;
    word-wrap: break-word;
    position: relative;
  }
  .user-question{
    align-self: flex-end;
    background-color:  #007aff;
    border-radius: 15px;
    padding: 8px 10px;
    color: white;
    word-wrap: break-word;
  }

  .input-container {
    position: relative;
    width: calc(100% - 20px);
    margin: 0 auto;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .expandable-textarea {
    width: calc(100% - 65px);
    height: 40px;
    min-height: 40px;
    max-height: 80px;
    padding: 10px 40px 10px 10px;
    border: 1px solid #ccc;
    border-radius: 20px;
    resize: none;
    overflow-y: auto;
    transition: all 0.3s ease;
    font-size: 16px;
    box-sizing: border-box;
    line-height: 18px;
  }

  .expandable-textarea:focus {
    outline: none;
    border-color: #007bff;
    box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
  }

  .send-icon {
    position: absolute;
    right: 40px;
    top: 50%;
    transform: translateY(-50%);
    width: 22px;
    height: 22px;
    cursor: pointer;
    opacity: 0.6;
    transition: opacity 0.3s ease;
  }

  .send-icon:hover {
    opacity: 1;
  }
`;

const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = styles;
document.head.appendChild(styleSheet);
