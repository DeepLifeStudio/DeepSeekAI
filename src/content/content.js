import { createIcon, createSvgIcon } from "./icon";
import { createPopup, stylePopup, styleResponseContainer } from "./popup";

import "perfect-scrollbar/css/perfect-scrollbar.css";

let aiResponseContainer;
let isCreatingPopup = false;

const link = document.createElement("link");
link.rel = "stylesheet";
link.href = chrome.runtime.getURL("style.css");
document.head.appendChild(link);

document.addEventListener("mouseup", function (event) {
  if (isCreatingPopup) return; // 如果正在创建 popup，不执行后续操作

  const selectedText = window.getSelection().toString().trim();
  if (selectedText && event.button === 0) {
    const range = window.getSelection().getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const icon = createIcon(event.pageX, event.pageY);

    document.body.appendChild(icon);

    icon.addEventListener("click", function iconClickHandler(e) {
      e.stopPropagation();
      e.preventDefault();

      if (isCreatingPopup) return; // 防止重复创建
      isCreatingPopup = true;

      // 立即移除事件监听器，防止多次触发
      icon.removeEventListener("click", iconClickHandler);

      createPopup(selectedText, rect);

      // 使用 setTimeout 来确保 popup 创建后再移除图标和选择
      setTimeout(() => {
        if (document.body.contains(icon)) {
          document.body.removeChild(icon);
        }
        window.getSelection().removeAllRanges();
        isCreatingPopup = false; // 重置标志
      }, 100);
    });

    document.addEventListener("mousedown", function documentClickHandler(e) {
      if (!isCreatingPopup && !icon.contains(e.target)) {
        document.body.removeChild(icon);
        window.getSelection().removeAllRanges();
      }
      // 移除事件监听器
      document.removeEventListener("mousedown", documentClickHandler);
    });
  }
});

function handleDocumentClick(event, icon, range) {
  if (isCreatingPopup) return; // 如果正在创建 popup，不执行后续操作

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

