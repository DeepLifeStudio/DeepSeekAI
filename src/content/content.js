import { createIcon, createSvgIcon } from "./icon";
import { createPopup, stylePopup, styleResponseContainer } from "./popup";

import "perfect-scrollbar/css/perfect-scrollbar.css";

let aiResponseContainer;

const link = document.createElement("link");
link.rel = "stylesheet";
link.href = chrome.runtime.getURL("style.css");
document.head.appendChild(link);

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


