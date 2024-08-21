import interact from "interactjs";

export function setupInteract(popup) {
  const dragHandle = createDragHandle(popup);
  interact(dragHandle).draggable({
    inertia: true,
    modifiers: [
      interact.modifiers.restrictRect({
        restriction: "body",
        endOnly: true,
      }),
    ],
    listeners: {
      move: dragMoveListener,
    },
  });

  interact(popup).resizable({
    edges: { left: true, right: true, bottom: true, top: true },
    modifiers: [
      interact.modifiers.restrictSize({
        min: { width: 100, height: 100 },
        max: { width: 600, height: 400 },
      }),
    ],
    listeners: {
      move: function (event) {
        let { x, y } = event.target.dataset;
        x = (parseFloat(x) || 0) + event.deltaRect.left;
        y = (parseFloat(y) || 0) + event.deltaRect.top;

        Object.assign(event.target.style, {
          width: `${event.rect.width}px`,
          height: `${event.rect.height}px`,
          transform: `translate(${x}px, ${y}px)`,
        });

        Object.assign(event.target.dataset, { x, y });
      },
    },
  });
}
