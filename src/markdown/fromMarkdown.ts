import type { Block, BlockDocument, InlineContent } from "../types.js";
import { DOCUMENT_SCHEMA_VERSION } from "../types.js";
import { generateBlockId } from "../id.js";
import { calloutBlock } from "../blocks/callout.js";
import { parseImageLine, parseInline, plainText } from "./inline.js";

const FRONT_MATTER_KEY = /^[A-Za-z_][\w-]*\s*:/;
const FENCE = /^(\s*)(`{3,}|~{3,})(.*)$/;
const ATX_HEADING = /^ {0,3}(#{1,6})(?:[ \t]+(.*))?$/;
const HORIZONTAL_RULE = /^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/;
const SETEXT_H1 = /^ {0,3}=+[ \t]*$/;
const SETEXT_H2 = /^ {0,3}-+[ \t]*$/;
const BLOCKQUOTE = /^ {0,3}>/;
const BLOCKQUOTE_PREFIX = /^(?: {0,3}> ?)+/;
const LIST_ITEM = /^(\s*)([-*+]|\d{1,9}[.)])(?:[ \t]+(.*))?$/;
const TASK_MARKER = /^\[([ xX])\](?:[ \t]+(.*))?$/;
const TABLE_ROW = /^\s*\|.+\|\s*$/;
const TABLE_DELIMITER_ROW = /^\s*\|?\s*:?-+:?\s*(?:\|\s*:?-+:?\s*)*\|?\s*$/;
const HTML_COMMENT_LINE = /^\s*<!--.*-->\s*$/;
const IMAGE_CAPTION = /^\s*(?:\*([^*]+)\*|_([^_]+)_)\s*$/;
const CALLOUT_ICON =
  /^((?![\u00A9\u00AE\u2122])\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic}|[\u{1F3FB}-\u{1F3FF}])*)(?:\s+(.*))?$/su;

function newBlock(type: string, props: Record<string, unknown>, content?: InlineContent[]): Block {
  const block: Block = { id: generateBlockId(), type, props, children: [] };
  if (content) block.content = content;
  return block;
}

function indentColumns(line: string): number {
  let columns = 0;
  for (const ch of line) {
    if (ch === " ") columns += 1;
    else if (ch === "\t") columns += 4 - (columns % 4);
    else break;
  }
  return columns;
}

/** Drops one trailing hard-break backslash; line breaks inside a block become single spaces. */
function stripHardBreak(line: string): string {
  const trailing = /\\+$/.exec(line)?.[0].length ?? 0;
  return trailing % 2 === 1 ? line.slice(0, -1) : line;
}

function joinLines(lines: string[]): string {
  return lines.map((line) => stripHardBreak(line.trim())).join(" ").trim();
}

function stripFrontMatter(lines: string[]): string[] {
  if (lines[0]?.trim() !== "---" || !FRONT_MATTER_KEY.test(lines[1] ?? "")) return lines;
  for (let i = 2; i < lines.length; i++) {
    const line = lines[i]!.trim();
    if (line === "---" || line === "...") return lines.slice(i + 1);
  }
  return lines;
}

/**
 * Converts Markdown to a `BlockDocument` -- the inverse of `documentToMarkdown`, and just as
 * best-effort. Supported: ATX and setext headings (levels 4-6 clamp to 3), paragraphs, bullet /
 * numbered / task lists (nested by indentation), blockquotes (an emoji-led quote becomes a
 * callout, matching the export format), fenced code, thematic breaks, images (a following italic
 * line becomes the caption), and inline bold / italic / strikethrough / code / links / `<u>`.
 *
 * Anything else degrades instead of failing: tables become one paragraph per row, HTML comments
 * and YAML front matter are dropped, inline images keep only their alt text, and a paragraph's
 * line breaks collapse to spaces (the block model has no soft line break). Links with unsafe
 * schemes such as `javascript:` are stripped, so it is safe to import untrusted Markdown.
 *
 * Blocks get fresh ids. Numbered lists keep their order but not their start number.
 */
export function markdownToDocument(markdown: string): BlockDocument {
  const source = markdown.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const lines = stripFrontMatter(source.split("\n"));

  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let listStack: Array<{ indent: number; block: Block }> = [];
  let openItem: { block: Block; text: string } | null = null;

  const finishItem = () => {
    if (openItem) {
      openItem.block.content = parseInline(openItem.text.trim());
      openItem = null;
    }
  };

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      blocks.push(newBlock("paragraph", {}, parseInline(joinLines(paragraph))));
      paragraph = [];
      listStack = [];
    }
  };

  const closeOpenBlocks = () => {
    finishItem();
    flushParagraph();
  };

  const pushBlock = (block: Block) => {
    blocks.push(block);
    listStack = [];
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;

    if (/^\s*$/.test(line)) {
      closeOpenBlocks();
      i++;
      continue;
    }

    const fence = FENCE.exec(line);
    if (fence && !(fence[2]!.startsWith("`") && fence[3]!.includes("`"))) {
      closeOpenBlocks();
      const fenceIndent = fence[1]!.length;
      const marker = fence[2]!;
      const closing = new RegExp(`^\\s*${marker[0] === "`" ? "`" : "~"}{${marker.length},}\\s*$`);
      const language = fence[3]!.trim().split(/\s+/)[0] ?? "";
      const code: string[] = [];
      i++;
      while (i < lines.length && !closing.test(lines[i]!)) {
        const codeLine = lines[i]!;
        const leading = /^ */.exec(codeLine)![0].length;
        code.push(codeLine.slice(Math.min(leading, fenceIndent)));
        i++;
      }
      i++;
      pushBlock(newBlock("code", { language, code: code.join("\n") }));
      continue;
    }

    if (HTML_COMMENT_LINE.test(line)) {
      closeOpenBlocks();
      i++;
      continue;
    }
    if (/^\s*<!--/.test(line)) {
      closeOpenBlocks();
      while (i < lines.length && !lines[i]!.includes("-->")) i++;
      i++;
      continue;
    }

    if (paragraph.length > 0 && (SETEXT_H1.test(line) || SETEXT_H2.test(line))) {
      const level = SETEXT_H1.test(line) ? 1 : 2;
      const content = parseInline(joinLines(paragraph));
      paragraph = [];
      pushBlock(newBlock("heading", { level }, content));
      i++;
      continue;
    }

    if (HORIZONTAL_RULE.test(line)) {
      closeOpenBlocks();
      pushBlock(newBlock("divider", {}));
      i++;
      continue;
    }

    const heading = ATX_HEADING.exec(line);
    if (heading) {
      closeOpenBlocks();
      const text = (heading[2] ?? "").replace(/[ \t]+#+[ \t]*$/, "").replace(/^#+[ \t]*$/, "").trim();
      pushBlock(newBlock("heading", { level: Math.min(heading[1]!.length, 3) }, parseInline(text)));
      i++;
      continue;
    }

    if (BLOCKQUOTE.test(line)) {
      closeOpenBlocks();
      const groups: string[][] = [[]];
      while (i < lines.length && BLOCKQUOTE.test(lines[i]!)) {
        const inner = lines[i]!.replace(BLOCKQUOTE_PREFIX, "");
        if (/^\s*$/.test(inner)) {
          if (groups[groups.length - 1]!.length > 0) groups.push([]);
        } else {
          groups[groups.length - 1]!.push(inner);
        }
        i++;
      }
      for (const group of groups) {
        if (group.length === 0) continue;
        const text = joinLines(group);
        const callout = CALLOUT_ICON.exec(text);
        if (callout) {
          pushBlock(
            newBlock(
              "callout",
              { icon: callout[1]!, color: calloutBlock.defaultProps.color },
              parseInline(callout[2] ?? "")
            )
          );
        } else {
          pushBlock(newBlock("quote", {}, parseInline(text)));
        }
      }
      continue;
    }

    const item = LIST_ITEM.exec(line);
    if (item) {
      const marker = item[2]!;
      const ordered = /\d/.test(marker[0]!);
      // Only a non-empty bullet, or an ordered item numbered 1, may interrupt a paragraph.
      const interrupts = item[3] !== undefined && (!ordered || parseInt(marker, 10) === 1);
      if (paragraph.length === 0 || interrupts) {
        closeOpenBlocks();
        const rest = item[3] ?? "";
        const task = ordered ? null : TASK_MARKER.exec(rest);
        const block = task
          ? newBlock("todo", { checked: task[1] !== " " })
          : newBlock(ordered ? "numberedListItem" : "bulletedListItem", {});

        const indent = indentColumns(line);
        while (listStack.length > 0 && listStack[listStack.length - 1]!.indent >= indent) listStack.pop();
        const parent = listStack[listStack.length - 1]?.block;
        if (parent) parent.children!.push(block);
        else blocks.push(block);
        listStack.push({ indent, block });

        openItem = { block, text: task ? task[2] ?? "" : rest };
        i++;
        continue;
      }
    }

    const image = parseImageLine(line);
    if (image) {
      closeOpenBlocks();
      let caption = "";
      const captionMatch = i + 1 < lines.length ? IMAGE_CAPTION.exec(lines[i + 1]!) : null;
      if (captionMatch) {
        caption = plainText(parseInline((captionMatch[1] ?? captionMatch[2])!));
        i++;
      }
      pushBlock(newBlock("image", { src: image.src, alt: image.alt, caption }));
      i++;
      continue;
    }

    if (TABLE_ROW.test(line)) {
      closeOpenBlocks();
      if (!TABLE_DELIMITER_ROW.test(line)) {
        const cells = line
          .trim()
          .replace(/^\||\|$/g, "")
          .split("|")
          .map((cell) => cell.trim());
        pushBlock(newBlock("paragraph", {}, parseInline(cells.join(" | "))));
      }
      i++;
      continue;
    }

    if (openItem) {
      openItem.text += ` ${stripHardBreak(line.trim())}`;
    } else {
      paragraph.push(line);
    }
    i++;
  }

  closeOpenBlocks();
  return { version: DOCUMENT_SCHEMA_VERSION, blocks };
}
