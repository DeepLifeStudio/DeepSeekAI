export function dragMoveListener(event) {
  const target = event.target.parentNode;
  const x = (parseFloat(target.getAttribute("data-x")) || 0) + event.dx;
  const y = (parseFloat(target.getAttribute("data-y")) || 0) + event.dy;

  target.style.transform = `translate(${x}px, ${y}px)`;
  target.setAttribute("data-x", x);
  target.setAttribute("data-y", y);
}

export function resizeMoveListener(event) {
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
