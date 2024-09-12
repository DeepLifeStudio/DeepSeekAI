import MarkdownIt from "markdown-it";
import hljs from "highlight.js";
import PerfectScrollbar from "perfect-scrollbar";
import "perfect-scrollbar/css/perfect-scrollbar.css";

export const md = MarkdownIt({
  highlight: function (str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        const highlighted = hljs.highlight(str, { language: lang }).value;
        return `
          <div class="code-block-wrapper">
            <pre class="hljs"><code>${highlighted}</code></pre>
            <button class="copy-button">
              <img src="${chrome.runtime.getURL(
                "icons/copy.svg"
              )}" alt="Copy" />
            </button>
          </div>
        `;
      } catch (__) {}
    }
    return `
      <div class="code-block-wrapper">
        <pre class="hljs"><code>${md.utils.escapeHtml(str)}</code></pre>
        <button class="copy-button">
          <img src="${chrome.runtime.getURL("icons/copy.svg")}" alt="Copy" />
        </button>
      </div>
    `;
  },
});

// 创建一个 Map 来存储每个代码块的 PerfectScrollbar 实例
const scrollbars = new Map();

// 在渲染完成后初始化 PerfectScrollbar 和复制按钮
md.renderer.rules.fence = (tokens, idx, options, env, slf) => {
  const token = tokens[idx];
  const code = token.content.trim();
  const firstLine = code.split(/\n/)[0];
  const language = token.info.trim() || hljs.highlightAuto(firstLine).language;
  const highlighted = md.options.highlight(code, language);

  setTimeout(() => {
    const codeBlocks = document.querySelectorAll(".code-block-wrapper");
    codeBlocks.forEach((block, index) => {
      const pre = block.querySelector("pre");

      // 使用 ResizeObserver 检测内容变化
      const resizeObserver = new ResizeObserver((entries) => {
        for (let entry of entries) {
          if (entry.target === pre) {
            // 如果已经存在 PerfectScrollbar 实例，则更新它
            if (scrollbars.has(pre)) {
              scrollbars.get(pre).update();
            } else {
              // 否则，创建新的 PerfectScrollbar 实例
              const ps = new PerfectScrollbar(pre, {
                suppressScrollY: true,
                useBothWheelAxes: true,
              });
              scrollbars.set(pre, ps);
            }
          }
        }
      });

      // 开始观察 pre 元素
      resizeObserver.observe(pre);

      // 设置复制按钮事件
      const copyButton = block.querySelector(".copy-button");
      const codeElement = block.querySelector("code");

      copyButton.addEventListener("click", () => {
        navigator.clipboard.writeText(codeElement.textContent).then(() => {
          copyButton.classList.add("copied");
          copyButton.querySelector("img").src = chrome.runtime.getURL(
            "icons/copyClicked.svg"
          );
          setTimeout(() => {
            copyButton.classList.remove("copied");
            copyButton.querySelector("img").src =
              chrome.runtime.getURL("icons/copy.svg");
          }, 2000);
        });
      });

      // 鼠标悬停时显示复制按钮
      block.addEventListener("mouseenter", () => {
        copyButton.style.display = "flex";
      });

      block.addEventListener("mouseleave", () => {
        copyButton.style.display = "none";
      });
    });
  }, 0);

  return `<div class="code-block-wrapper">${highlighted}</div>`;
};

// 添加所需的 CSS 样式
const style = document.createElement("style");
style.textContent = `
  .code-block-wrapper {
    position: relative;
    margin: 1em 0;
    border-radius: 8px;
    overflow: hidden;
  }
  .code-block-wrapper pre {
    margin: 0;
    padding: 16px;
    background-color: #F2F2F7;
    font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace;
    font-size: 14px;
    line-height: 1.5;
    overflow-x: auto;
    overflow-y: hidden;
    white-space: pre;
  }
  .code-block-wrapper code {
    background-color: transparent;
    color: #1D1D1F;
    display: inline-block;
    min-width: 100%;
  }
  .copy-button {
    position: absolute;
    top: 8px;
    right: 8px;
    background-color: rgba(255, 255, 255, 0.8);
    border: none;
    border-radius: 4px;
    cursor: pointer;
    display: none;
    align-items: center;
    justify-content: center;
    padding: 4px;
    transition: all 0.2s ease;
  }
  .copy-button:hover {
    background-color: rgba(255, 255, 255, 1);
    transform: scale(1.1);
  }
  .copy-button img {
    width: 16px;
    height: 16px;
  }
`;
document.head.appendChild(style);
