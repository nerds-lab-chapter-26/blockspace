import type { ReactNode } from "react";
import type { InlineContent, InlineMark } from "../types.js";

function wrapWithMark(node: ReactNode, mark: InlineMark, key: string): ReactNode {
  switch (mark.type) {
    case "bold":
      return <strong key={key}>{node}</strong>;
    case "italic":
      return <em key={key}>{node}</em>;
    case "underline":
      return <u key={key}>{node}</u>;
    case "strikethrough":
      return <s key={key}>{node}</s>;
    case "code":
      return (
        <code key={key} style={{ fontFamily: "monospace", background: "rgba(135,131,120,0.15)", borderRadius: 3, padding: "0.15em 0.3em" }}>
          {node}
        </code>
      );
    case "link":
      return (
        <a key={key} href={mark.href || "#"} target="_blank" rel="noopener noreferrer">
          {node}
        </a>
      );
    default:
      return node;
  }
}

export function renderInlineContent(content: InlineContent[] | undefined): ReactNode {
  if (!content || content.length === 0) return null;
  return content.map((run, i) => {
    let node: ReactNode = run.text;
    for (let m = run.marks.length - 1; m >= 0; m--) {
      node = wrapWithMark(node, run.marks[m]!, `m${m}`);
    }
    return <span key={i}>{node}</span>;
  });
}
