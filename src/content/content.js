
import "./publicPath";
import { initMouseHandlers, hideQuickActions } from "./handlers/MouseHandler";
import { popupManager } from "./components/PopupManager";
import { selectionManager } from "./components/SelectionManager";
import { popupStateManager } from './utils/popupStateManager';

// Debug log
console.log(`DeepSeek AI: Content script injected on ${window.location.href}`);

// State
let isSelectionEnabled = true;

// Helper for Reliable Selected Text (moved logic here or accesss via MouseHandler if exported?
// For simplicity, I'll re-implement a robust version here using selectionManager as primary source)
function getReliableSelectedText() {
  const selection = window.getSelection();
  if (selection && selection.toString && selection.toString().trim()) {
    return selection.toString().trim();
  }
  if (selectionManager.hasSelection()) {
      return selectionManager.getSavedText();
  }
  return "";
}

// Load settings
chrome.storage.sync.get(['selectionEnabled'], function(data) {
  if (typeof data.selectionEnabled !== 'undefined') {
    isSelectionEnabled = data.selectionEnabled;
  }
});

chrome.storage.onChanged.addListener(function(changes, namespace) {
  if (namespace === 'sync') {
    if (changes.selectionEnabled) {
      isSelectionEnabled = changes.selectionEnabled.newValue;
      if (!isSelectionEnabled) {
        // Remove icon/quick actions
        hideQuickActions();
      }
    }
  }
});

// Initialize Mouse Handlers
initMouseHandlers(() => isSelectionEnabled);

// Message Listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "toggleChat") {
    try {
      if (popupManager.currentPopup || popupStateManager.isMinimized()) {
        popupManager.safeRemovePopup(true);
        popupStateManager.setMinimized(false);
        popupStateManager.setVisible(false);
        return;
      }

      let selectedTextContent = "";
      if (selectionManager.hasSelection()) {
        selectedTextContent = selectionManager.getSavedText();
      } else if (request.selectedText) {
        selectedTextContent = request.selectedText;
      } else {
        selectedTextContent = getReliableSelectedText();
      }

      const finalSelectedText = selectedTextContent;
      let rect;
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0 && selection.toString().trim()) {
        rect = selection.getRangeAt(0).getBoundingClientRect();
      } else {
        rect = {
          left: window.innerWidth / 2,
          top: window.innerHeight / 2 - 190,
          width: 0,
          height: 0
        };
      }

      const textToUse = finalSelectedText || request.useGreeting;
      const hideQuestion = !finalSelectedText;

      popupManager.handlePopupCreation(textToUse, rect, hideQuestion);
    } catch (error) {
      console.warn('Error handling toggleChat:', error);
      popupManager.safeRemovePopup();
    }
  } else if (request.action === "showHideChat") {
    try {
      if (popupStateManager.isMinimized() && popupManager.minimizeIcon) {
        popupManager.restorePopup();
        return;
      }

      if (popupManager.currentPopup) {
        const isCurrentlyVisible = popupManager.currentPopup.style.display !== 'none';
        if (isCurrentlyVisible) {
          popupManager.minimizePopup();
        } else {
          popupManager.currentPopup.style.display = 'block';
          requestAnimationFrame(() => {
            popupManager.currentPopup.style.opacity = '1';
            popupManager.currentPopup.style.transform = 'translateY(0) scale(1)';
          });
          popupStateManager.setVisible(true);
          setTimeout(() => {
            if (popupManager.currentPopup) {
              const textarea = popupManager.currentPopup.querySelector('.expandable-textarea');
              if (textarea) textarea.focus();
            }
          }, 100);
        }
        return;
      }

      let selectedTextContent = "";
      if (selectionManager.hasSelection()) {
        selectedTextContent = selectionManager.getSavedText();
      } else if (request.selectedText) {
        selectedTextContent = request.selectedText;
      } else {
        selectedTextContent = getReliableSelectedText();
      }

      const finalSelectedText = selectedTextContent;
      let rect;
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0 && selection.toString().trim()) {
        rect = selection.getRangeAt(0).getBoundingClientRect();
      } else {
        rect = {
          left: window.innerWidth / 2,
          top: window.innerHeight / 2 - 190,
          width: 0,
          height: 0
        };
      }

      const textToUse = finalSelectedText || request.useGreeting;
      const hideQuestion = !finalSelectedText;

      popupManager.handlePopupCreation(textToUse, rect, hideQuestion);
    } catch (error) {
      console.warn('Error handling showHideChat:', error);
      popupManager.safeRemovePopup();
    }
  } else if (request.action === "createPopup") {
    try {
      let selectedTextContent = request.selectedText;
      if (!selectedTextContent) {
        const selection = window.getSelection();
        selectedTextContent = selection && selection.toString ? selection.toString().trim() : "";
      }

      let rect;
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0 && selection.toString().trim()) {
        rect = selection.getRangeAt(0).getBoundingClientRect();
      } else {
        rect = {
          left: window.innerWidth / 2,
          top: window.innerHeight / 2 - 190,
          width: 0,
          height: 0
        };
      }

      const textToUse = selectedTextContent || request.message;
      const hideQuestion = !selectedTextContent;

      popupManager.handlePopupCreation(textToUse, rect, hideQuestion);
    } catch (error) {
      console.warn('Error handling createPopup:', error);
      popupManager.safeRemovePopup();
    }
  } else if (request.action === "getSelectedText") {
    sendResponse({ selectedText: getReliableSelectedText() });
  } else if (request.action === "closeChat") {
    if (popupManager.minimizeIcon && document.body.contains(popupManager.minimizeIcon)) {
      if (popupManager.minimizeIcon.cleanup) {
        popupManager.minimizeIcon.cleanup();
      }
      document.body.removeChild(popupManager.minimizeIcon);
      popupManager.minimizeIcon = null;
    }
    popupManager.safeRemovePopup(true);
    popupStateManager.setMinimized(false);
    popupStateManager.setVisible(false);
  }
});
