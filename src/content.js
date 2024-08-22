import MarkdownIt from "markdown-it";
import hljs from "highlight.js";
import interact from "interactjs";
import PerfectScrollbar from "perfect-scrollbar";
import "perfect-scrollbar/css/perfect-scrollbar.css";

let aiResponseContainer;

const link = document.createElement("link");
link.rel = "stylesheet";
let allowAutoScroll = true;
link.href = chrome.runtime.getURL("style.css");
document.head.appendChild(link);

const md = MarkdownIt({
  highlight: function (str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return `<pre class="hljs"><code>${
          hljs.highlight(str, { language: lang }).value
        }</code></pre>`;
      } catch (__) {}
    }
    return `<pre class="hljs"><code>${md.utils.escapeHtml(str)}</code></pre>`; // 使用外部默认 escaping
  },
});

document.addEventListener("mouseup", function (event) {
  const selectedText = window.getSelection().toString().trim();
  if (selectedText && event.button === 0) {
    const range = window.getSelection().getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const icon = createIcon(event.pageX, event.pageY);

    document.body.appendChild(icon);

    icon.addEventListener("click", () => {
      createPopup(selectedText, rect);
      window.getSelection().removeAllRanges();
      document.body.removeChild(icon);
    });
    document.addEventListener(
      "mousedown",
      (e) => handleDocumentClick(e, icon, range),
      { once: true }
    );
  }
});

function createIcon(x, y) {
  const icon = document.createElement("img");
  icon.src = chrome.runtime.getURL("icons/icon24.png");
  Object.assign(icon.style, {
    position: "absolute",
    cursor: "pointer",
    left: `${x}px`,
    top: `${y}px`,
  });
  return icon;
}

function handleDocumentClick(event, icon, range) {
  const selection = window.getSelection();
  const clickedIcon = icon.contains(event.target);
  const clickedInsideSelection = isClickInsideSelection(event, range);

  if (!clickedIcon && !clickedInsideSelection) {
    document.body.removeChild(icon);
    selection.removeAllRanges();
  } else if (event.button === 2 && clickedInsideSelection) {
    document.body.removeChild(icon);
  } else if (event.button === 0 && clickedInsideSelection) {
    document.body.removeChild(icon);
    selection.removeAllRanges();
  }
}

function isClickInsideSelection(event, range) {
  const rect = range.getBoundingClientRect();
  return (
    event.clientX >= rect.left &&
    event.clientX <= rect.right &&
    event.clientY >= rect.top &&
    event.clientY <= rect.bottom
  );
}
function createPopup(text, rect) {
  const popup = document.createElement("div");

  stylePopup(popup, rect);
  const aiResponseElement = document.createElement("div");
  aiResponseContainer = document.createElement("div");
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
    const tempElement=document.createElement("dic")
    tempElement.innerHTML=aiResponse.innerHTML
    const iconContainer=tempElement.querySelector(".icon-wrapper");
    if(iconContainer){
      iconContainer.remove()
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
    iconContainer
  );

  refreshIcon.addEventListener("click", (event) => {
    event.stopPropagation(); // 阻止事件冒泡
    const aiResponseElement = document.getElementById("ai-response");
    abortController.abort(); // 中止之前的请求
    abortController = new AbortController();
    getAIResponse(
      text,
      aiResponseElement,
      abortController.signal,
      ps,
      iconContainer
    );
  });

  aiResponseContainer.addEventListener("wheel", () => {
    allowAutoScroll = false;
    const { scrollTop, scrollHeight, clientHeight } = aiResponseContainer;
    if (scrollHeight - scrollTop <= clientHeight) {
      allowAutoScroll = true;
    }
  });

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

function createSvgIcon(text, title) {
  const wrapper = document.createElement("div");
  wrapper.className = "icon-wrapper tooltip";
  wrapper.style.position = "relative";
  wrapper.style.display = "inline-block";
  const icon = document.createElement("img");
  icon.style.width = "17px";
  icon.style.height = "17px";
  icon.src = chrome.runtime.getURL(`icons/${text}.svg`);
  icon.style.border = "none";
  icon.style.cursor = "pointer";
  icon.style.transition = "transform 0.5 ease";
  icon.addEventListener("mousedown", () => {
    icon.src = chrome.runtime.getURL(`icons/${text}Clicked.svg`);
    icon.style.transform = "scale(1.2)";
  });
  icon.addEventListener("mouseup", () => {
    icon.style.transform = "scale(1)";
    icon.src = chrome.runtime.getURL(`icons/${text}.svg`);
  });
  const tooltip = document.createElement("span");
  tooltip.className = "tooltiptext";
  tooltip.textContent = title;
  tooltip.style.visibility = "hidden";
  tooltip.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
  tooltip.style.color = "white";
  tooltip.style.textAlign = "center";
  tooltip.style.padding = "4px 8px";
  tooltip.style.borderRadius = "5px";
  tooltip.style.position = "absolute";
  tooltip.style.zIndex = "1";
  tooltip.style.bottom = "125%";
  tooltip.style.left = "50%";
  tooltip.style.transform = "translateX(-50%)";
  tooltip.style.whiteSpace = "nowrap";

  wrapper.appendChild(icon);
  wrapper.appendChild(tooltip);

  wrapper.addEventListener("mouseenter", () => {
    tooltip.style.visibility = "visible";
  });

  wrapper.addEventListener("mouseleave", () => {
    tooltip.style.visibility = "hidden";
  });

  return wrapper;
}
function stylePopup(popup, rect) {
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

function styleResponseContainer(container) {
  container.style.position = "relative";
  container.id = "ai-response-container";
  container.style.width = "100%";
  container.style.height = "calc(100% - 40px)";
  container.style.marginTop = "20px";
  container.style.overflow = "auto";
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

  // 创建logo元素
  const logo = document.createElement("img");
  logo.src = chrome.runtime.getURL("icons/icon24.png"); // 假设logo图片路径为icons/logo.png
  logo.style.height = "24px"; // 设置logo高度
  logo.style.marginRight = "10px"; // 设置logo与文本之间的间距

  // 将logo添加到dragHandle中
  dragHandle.appendChild(logo);

  // 添加文本内容
  const textNode = document.createTextNode("DeepSeek AI");
  dragHandle.appendChild(textNode);

  return dragHandle;
}

function dragMoveListener(event) {
  const target = event.target.parentNode;
  const x = (parseFloat(target.getAttribute("data-x")) || 0) + event.dx;
  const y = (parseFloat(target.getAttribute("data-y")) || 0) + event.dy;

  target.style.transform = `translate(${x}px, ${y}px)`;
  target.setAttribute("data-x", x);
  target.setAttribute("data-y", y);
}

function resizeMoveListener(event) {
  let { x, y } = event.target.dataset;
  x = (parseFloat(x) || 0) + event.deltaRect.left;
  y = (parseFloat(y) || 0) + event.deltaRect.top;

  Object.assign(event.target.style, {
    width: `${event.rect.width}px`,
    height: `${event.rect.height}px`,
    transform: `translate(${x}px, ${y}px)`,
  });

  Object.assign(event.target.dataset, { x, y });
}

async function getAIResponse(text, responseElement, signal, ps, iconContainer) {
  responseElement.innerHTML = "";
  allowAutoScroll = true;
  iconContainer.style.display = "none";
  iconContainer.dataset.ready = "false"; // 使用dataset来标记是否准备好
  const { apiKey } = await new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: "getApiKey" }, resolve);
  });

  if (!apiKey) {
    responseElement.innerHTML =
      "Please set your API key in the extension popup.";
    return;
  }

  try {
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content:
              "你是一个有帮助的AI助手,不管用户的语言选择，你都必须以中文提供文本回答",
          },
          { role: "user", content: text },
        ],
        stream: true,
      }),
      signal: signal,
    });

    if (!response.ok) {
      handleError(response.status, responseElement);
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let aiResponse = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n\n");

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const jsonLine = line.slice(6);
          if (jsonLine === "[DONE]") break;

          try {
            const data = JSON.parse(jsonLine);
            if (
              data.choices &&
              data.choices[0].delta &&
              data.choices[0].delta.content
            ) {
              aiResponse += data.choices[0].delta.content;
              responseElement.innerHTML = md.render(aiResponse);
              ps.update();
              if (allowAutoScroll) {
                aiResponseContainer.scrollTop =
                  aiResponseContainer.scrollHeight;
              }
            }
          } catch (e) {
            console.error("Error parsing JSON:", e);
          }
        }
      }
    }
    responseElement.appendChild(iconContainer);
    iconContainer.dataset.ready = "true";
  } catch (error) {
    console.error("Fetch error:", error);
    responseElement.innerHTML = "请求失败，请稍后重试。";
  }
}

function handleError(status, responseElement) {
  const errorMessages = {
    400: "请求体格式错误，请检查并修改。",
    401: "API key 错误，认证失败。",
    402: "账号余额不足，请充值。",
    422: "请求体参数错误，请检查并修改。",
    429: "请求速率达到上限，请稍后重试。",
    500: "服务器内部故障，请稍后重试。",
    503: "服务器负载过高，请稍后重试。",
  };
  responseElement.innerHTML = errorMessages[status] || "请求失败，请稍后重试。";
}
