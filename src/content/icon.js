export function createIcon(x, y) {
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

export function createSvgIcon(text, title) {
  const wrapper = document.createElement("div");
  wrapper.className = "icon-wrapper tooltip";
  wrapper.style.position = "relative";
  wrapper.style.display = "inline-block";
  const icon = document.createElement("img");
  icon.style.width = "15px";
  icon.style.height = "15px";
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
