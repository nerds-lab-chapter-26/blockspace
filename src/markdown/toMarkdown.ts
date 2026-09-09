import type { Block, BlockDocument, InlineContent, InlineMark } from "../types.js";
import type { BlockRegistry } from "../registry.js";

function wrapMark(text: string, mark: InlineMark): string {
  switch (mark.type) {
    case "bold":
      return `**${text}**`;
    case "italic":
      return `*${text}*`;
    case "strikethrough":
      return `~~${text}~~`;
    case "code":
      return `\`${text}\``;
    case "underline":
      // CommonMark has no native underline syntax; inline HTML is the common fallback.
      return `<u>${text}</u>`;
    case "link":
      return `[${text}](${mark.href ?? ""})`;
    default:
      return text;
  }
}

function inlineToMarkdown(content: InlineContent[] | undefined): string {
  if (!content) return "";
  return content
    .map((run) => {
      let text = run.text;
      for (let i = run.marks.length - 1; i >= 0; i--) {
        text = wrapMark(text, run.marks[i]!);
      }
      return text;
    })
    .join("");
}

function blockToMarkdown(block: Block, indent: string, listNumber: number): string {
  const text = inlineToMarkdown(block.content);

  switch (block.type) {
    case "paragraph":
      return text;
    case "heading": {
      const level = Math.min(Math.max(Math.trunc(Number(block.props.level)) || 1, 1), 6);
      return `${"#".repeat(level)} ${text}`;
    }
    case "bulletedListItem":
      return `${indent}- ${text}`;
    case "numberedListItem":
      return `${indent}${listNumber}. ${text}`;
    case "todo": {
      const checked = Boolean(block.props.checked);
      return `${indent}- [${checked ? "x" : " "}] ${text}`;
    }
    case "quote":
      return `> ${text}`;
    case "callout": {
      const icon = typeof block.props.icon === "string" ? block.props.icon : "💡";
      return `> ${icon} ${text}`;
    }
    case "code": {
      const language = typeof block.props.language === "string" ? block.props.language : "";
      const code = typeof block.props.code === "string" ? block.props.code : "";
      return `\`\`\`${language}\n${code}\n\`\`\``;
    }
    case "divider":
      return "---";
    case "image": {
      const src = typeof block.props.src === "string" ? block.props.src : "";
      const alt = typeof block.props.alt === "string" ? block.props.alt : "";
      const caption = typeof block.props.caption === "string" ? block.props.caption : "";
      const img = `![${alt}](${src})`;
      return caption ? `${img}\n*${caption}*` : img;
    }
    default:
      return text || `<!-- unsupported block type: "${block.type}" -->`;
  }
}

function blocksToMarkdown(blocks: Block[], depth: number, registry: BlockRegistry | undefined): string {
  const indent = "  ".repeat(depth);
  let numberedCounter = 0;
  const parts: string[] = [];

  for (const block of blocks) {
    numberedCounter = block.type === "numberedListItem" ? numberedCounter + 1 : 0;

    const custom = registry?.get(block.type)?.toMarkdown;
    const rendered = custom
      ? custom(block.props, block.content)
      : blockToMarkdown(block, indent, numberedCounter);
    parts.push(rendered);

    if (block.children && block.children.length > 0) {
      parts.push(blocksToMarkdown(block.children, depth + 1, registry));
    }
  }

  return parts.filter((p) => p.length > 0).join("\n\n");
}

/**
 * Converts a document to Markdown. This is a one-way, best-effort export -- Markdown can't
 * represent everything a block can hold (a todo's checked state round-trips as `- [x]`, but a
 * callout's color or an image's alt text has no standard syntax and is dropped). Use it for
 * backup, static site generators, or interop with Markdown-based tools -- not as a lossless
 * serialization format. The JSON `BlockDocument` remains the source of truth.
 *
 * Pass `registry` to let custom block types define their own `toMarkdown` in `defineBlock`;
 * without it, unknown block types fall back to their plain text content.
 */
export function documentToMarkdown(doc: BlockDocument, registry?: BlockRegistry): string {
  const body = blocksToMarkdown(doc.blocks, 0, registry).trim();
  return body ? `${body}\n` : "";
}
