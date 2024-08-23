let allowAutoScroll = true;

export function setAllowAutoScroll(value) {
  allowAutoScroll = value;
}

export function getAllowAutoScroll() {
  return allowAutoScroll;
}

export function updateAllowAutoScroll(container) {
  const { scrollTop, scrollHeight, clientHeight } = container;
  allowAutoScroll = scrollHeight - scrollTop <= clientHeight;
}
