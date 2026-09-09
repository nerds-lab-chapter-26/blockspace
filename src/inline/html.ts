import type { InlineContent, InlineMark } from "../types.js";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wrapMarkHtml(inner: string, mark: InlineMark): string {
  switch (mark.type) {
    case "bold":
      return `<strong>${inner}</strong>`;
    case "italic":
      return `<em>${inner}</em>`;
    case "underline":
      return `<u>${inner}</u>`;
    case "strikethrough":
      return `<s>${inner}</s>`;
    case "code":
      return `<code>${inner}</code>`;
    case "link":
      return `<a href="${escapeHtml(mark.href ?? "")}">${inner}</a>`;
    default:
      return inner;
  }
}

/**
 * The exact HTML counterpart to `domToInline`. Round-tripping through both must be stable —
 * EditableRichText relies on that to detect self-originated vs. external content changes
 * without disturbing the caret (see EditableRichText.tsx for why).
 */
export function inlineToHtml(content: InlineContent[]): string {
  return content
    .map((run) => {
      let html = escapeHtml(run.text);
      for (let m = run.marks.length - 1; m >= 0; m--) {
        html = wrapMarkHtml(html, run.marks[m]!);
      }
      return html;
    })
    .join("");
}
