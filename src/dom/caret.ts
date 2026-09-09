/** Returns the caret's plain-text character offset within `root`, or null if the selection isn't inside it. */
export function getCaretOffset(root: HTMLElement): number | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  const range = selection.getRangeAt(0);
  if (!root.contains(range.startContainer)) return null;

  const preRange = range.cloneRange();
  preRange.selectNodeContents(root);
  preRange.setEnd(range.startContainer, range.startOffset);
  return preRange.toString().length;
}

/** Places the caret at a plain-text character offset within `root`. Clamps to content length. */
export function setCaretOffset(root: HTMLElement, offset: number): void {
  const selection = window.getSelection();
  if (!selection) return;

  let remaining = offset;
  let targetNode: Node = root;
  let targetOffset = 0;
  let found = false;

  const walk = (node: Node) => {
    if (found) return;
    if (node.nodeType === Node.TEXT_NODE) {
      const length = node.textContent?.length ?? 0;
      if (remaining <= length) {
        targetNode = node;
        targetOffset = remaining;
        found = true;
        return;
      }
      remaining -= length;
      return;
    }
    node.childNodes.forEach(walk);
  };
  walk(root);

  if (!found) {
    targetNode = root;
    targetOffset = root.childNodes.length;
  }

  const range = document.createRange();
  range.setStart(targetNode, targetOffset);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
}

export function focusBlockElement(el: HTMLElement, position: "start" | "end" = "start"): void {
  el.focus();
  const text = el.textContent ?? "";
  setCaretOffset(el, position === "start" ? 0 : text.length);
}
