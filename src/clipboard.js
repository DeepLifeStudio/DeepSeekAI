import ClipboardJS from "clipboard";

export function addCopyButtons() {
  const codeBlocks = document.querySelectorAll("pre code");
  codeBlocks.forEach((codeBlock) => {
    const pre = codeBlock.parentNode;
    let copyButton = pre.querySelector(".copy-button");
    if (!copyButton) {
      copyButton = document.createElement("button");
      copyButton.className = "copy-button";
      copyButton.textContent = "Copy";
      copyButton.dataset.clipboardText = codeBlock.textContent;
      pre.appendChild(copyButton);

      const clipboard = new ClipboardJS(".copy-button");
      clipboard.on("success", function (e) {
        e.trigger.textContent = "Copied!";
        setTimeout(() => {
          e.trigger.textContent = "Copy";
        }, 2000);
      });
    }
  });
}
