import { createIcon } from "./icon";
import { createPopup } from "./popup";
import "perfect-scrollbar/css/perfect-scrollbar.css";

let aiResponseContainer;
let isCreatingPopup = false;
let canCreateIcon = true;

const link = document.createElement("link");
link.rel = "stylesheet";
link.href = chrome.runtime.getURL("style.css");
document.head.appendChild(link);

// Function to handle popup creation
function handlePopupCreation(selectedText, rect) {
  if (isCreatingPopup) return;
  isCreatingPopup = true;
  canCreateIcon = false;

  // Create popup
  createPopup(selectedText, rect);

  // Reset flags after a short delay
  setTimeout(() => {
    isCreatingPopup = false;
    canCreateIcon = true;
  }, 100);
}

// Handle mouseup event to create icon
document.addEventListener("mouseup", function (event) {
  if (isCreatingPopup || !canCreateIcon) return;

  const selectedText = window.getSelection().toString().trim();
  if (selectedText && event.button === 0) {
    const range = window.getSelection().getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const icon = createIcon(event.pageX, event.pageY);

    document.body.appendChild(icon);

    // Handle icon click event
    icon.addEventListener("click", function iconClickHandler(e) {
      e.stopPropagation();
      e.preventDefault();

      // Clear selection
      window.getSelection().removeAllRanges();

      // Remove icon and create popup
      requestAnimationFrame(() => {
        if (document.body.contains(icon)) {
          document.body.removeChild(icon);
        }
        handlePopupCreation(selectedText, rect);
      });
    });

    // Handle document mousedown event
    const documentClickHandler = function (e) {
      if (e.button === 2 && !icon.contains(e.target)) {
        // Right-click, only remove icon
        document.body.removeChild(icon);
        e.preventDefault();
      } else if (e.button === 0 && !icon.contains(e.target)) {
        // Left-click, remove icon and selection
        document.body.removeChild(icon);
        window.getSelection().removeAllRanges();
      }
      document.removeEventListener("mousedown", documentClickHandler);
      canCreateIcon = true;
    };

    document.addEventListener("mousedown", documentClickHandler);
  }
});

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "createPopup") {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      handlePopupCreation(request.selectedText, rect);
    }
  }
});

// Helper function to check if click is inside selection
function isClickInsideSelection(event, range) {
  const rect = range.getBoundingClientRect();
  return (
    event.clientX >= rect.left &&
    event.clientX <= rect.right &&
    event.clientY >= rect.top &&
    event.clientY <= rect.bottom
  );
}
