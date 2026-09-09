import type { InlineContent, InlineMark } from "../types.js";

const TAG_TO_MARK: Record<string, InlineMark["type"] | undefined> = {
  B: "bold",
  STRONG: "bold",
  I: "italic",
  EM: "italic",
  U: "underline",
  S: "strikethrough",
  STRIKE: "strikethrough",
  CODE: "code",
  A: "link",
};

function marksEqual(a: InlineMark[], b: InlineMark[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((mark, i) => mark.type === b[i]?.type && mark.href === b[i]?.href);
}

/** Reads a contentEditable subtree back into the portable inline-content model. */
export function domToInline(root: Node): InlineContent[] {
  const runs: InlineContent[] = [];

  const visit = (node: Node, marks: InlineMark[]) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? "";
      if (text.length === 0) return;
      const last = runs[runs.length - 1];
      if (last && marksEqual(last.marks, marks)) {
        last.text += text;
      } else {
        runs.push({ type: "text", text, marks: marks.slice() });
      }
      return;
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element;
      if (el.tagName === "BR") return;
      const markType = TAG_TO_MARK[el.tagName];
      const nextMarks = markType
        ? [
            ...marks,
            markType === "link"
              ? { type: "link" as const, href: el.getAttribute("href") ?? "" }
              : { type: markType },
          ]
        : marks;
      el.childNodes.forEach((child) => visit(child, nextMarks));
    }
  };

  root.childNodes.forEach((child) => visit(child, []));
  return runs;
}

export function inlineToText(content: InlineContent[] | undefined): string {
  if (!content) return "";
  return content.map((run) => run.text).join("");
}

/** Splits inline content at a plain-text character offset, e.g. for handling Enter mid-block. */
export function splitInline(
  content: InlineContent[],
  offset: number
): [InlineContent[], InlineContent[]] {
  const before: InlineContent[] = [];
  const after: InlineContent[] = [];
  let consumed = 0;

  for (const run of content) {
    const runStart = consumed;
    const runEnd = consumed + run.text.length;
    if (runEnd <= offset) {
      before.push(run);
    } else if (runStart >= offset) {
      after.push(run);
    } else {
      const splitAt = offset - runStart;
      before.push({ ...run, text: run.text.slice(0, splitAt) });
      after.push({ ...run, text: run.text.slice(splitAt) });
    }
    consumed = runEnd;
  }

  return [before, after];
}

export function mergeInline(a: InlineContent[], b: InlineContent[]): InlineContent[] {
  const merged = [...a];
  for (const run of b) {
    const last = merged[merged.length - 1];
    if (last && marksEqual(last.marks, run.marks)) {
      last.text += run.text;
    } else {
      merged.push({ ...run });
    }
  }
  return merged;
}
