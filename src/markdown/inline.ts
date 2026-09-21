import type { InlineContent, InlineMark } from "../types.js";

// Inline Markdown -> InlineContent runs. Emphasis resolution follows the CommonMark delimiter-run
// algorithm (flanking rules, rule of 3, openers-bottom pruning) so nesting like `*a **b** c*`
// behaves the way people expect; everything else (links, code spans, escapes) is handled while
// tokenizing. Unsupported syntax degrades to literal text rather than throwing.

const MAX_DEPTH = 6;
const MAX_LINK_SCAN = 2048;
const ASCII_PUNCT = /[!-/:-@[-`{-~]/;
const UNICODE_PUNCT = /[\p{P}\p{S}]/u;
const WHITESPACE = /\s/;
const AUTOLINK = /<((?:https?:\/\/|mailto:)[^\s<>]*)>/iy;

interface TextNode {
  kind: "text";
  text: string;
  marks: InlineMark[];
}

interface DelimNode {
  kind: "delim";
  ch: "*" | "_" | "~" | "u";
  count: number;
  origCount: number;
  canOpen: boolean;
  canClose: boolean;
  raw: string;
  marks: InlineMark[];
}

type Node = TextNode | DelimNode;

function isWs(ch: string | undefined): boolean {
  return ch === undefined || WHITESPACE.test(ch);
}

function isPunct(ch: string | undefined): boolean {
  return ch !== undefined && UNICODE_PUNCT.test(ch);
}

/**
 * Only http(s), mailto, tel and scheme-less (relative/anchor) URLs survive import. Markdown from
 * an untrusted source must not be able to plant `javascript:` (or similar) hrefs that
 * `BlockRenderer` would later put in an `<a>`. Returns null when the URL is unsafe.
 */
export function sanitizeUrl(raw: string, kind: "link" | "image" = "link"): string | null {
  const url = raw.trim();
  // Browsers ignore control characters and whitespace inside a scheme ("java\tscript:").
  const compact = url.replace(/[\u0000-\u0020\u007f-\u009f\u00ad\u200b-\u200f\u2028\u2029\ufeff]/g, "");
  const match = /^([a-z][a-z0-9+.-]*):/i.exec(compact);
  if (!match) return url;
  const scheme = match[1]!.toLowerCase();
  if (scheme === "http" || scheme === "https") return url;
  if (kind === "link" && (scheme === "mailto" || scheme === "tel")) return url;
  if (kind === "image" && scheme === "data" && /^data:image\/(?:png|gif|jpe?g|webp|avif)[;,]/i.test(compact)) {
    return url;
  }
  return null;
}

class BacktickIndex {
  private readonly byLength = new Map<number, number[]>();

  constructor(text: string) {
    let i = 0;
    while (i < text.length) {
      if (text[i] !== "`") {
        i++;
        continue;
      }
      let n = 1;
      while (text[i + n] === "`") n++;
      const starts = this.byLength.get(n);
      if (starts) starts.push(i);
      else this.byLength.set(n, [i]);
      i += n;
    }
  }

  /** Start of the next backtick run of exactly `length` at or after `from`, or -1. */
  findClose(from: number, length: number): number {
    const starts = this.byLength.get(length);
    if (!starts) return -1;
    let lo = 0;
    let hi = starts.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (starts[mid]! < from) lo = mid + 1;
      else hi = mid;
    }
    return lo < starts.length ? starts[lo]! : -1;
  }
}

/** Maps each `[` index to its matching `]`, skipping escapes and code spans. One pass, O(n). */
function matchBrackets(text: string, backticks: BacktickIndex): Map<number, number> {
  const pairs = new Map<number, number>();
  const stack: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === "\\") {
      i++;
    } else if (c === "`") {
      let n = 1;
      while (text[i + n] === "`") n++;
      const close = backticks.findClose(i + n, n);
      i = close === -1 ? i + n - 1 : close + n - 1;
    } else if (c === "[") {
      stack.push(i);
    } else if (c === "]") {
      const open = stack.pop();
      if (open !== undefined) pairs.set(open, i);
    }
  }
  return pairs;
}

function unescapeMarkdown(text: string): string {
  return text.replace(/\\([!-/:-@[-`{-~])/g, "$1");
}

/** Parses the `(destination "title")` part of an inline link/image starting at the `(`. */
function parseLinkTail(text: string, start: number): { dest: string; end: number } | null {
  const limit = Math.min(text.length, start + MAX_LINK_SCAN);
  let i = start + 1;
  while (i < limit && (text[i] === " " || text[i] === "\t")) i++;

  let dest: string;
  if (text[i] === "<") {
    const close = text.indexOf(">", i + 1);
    if (close === -1 || close >= limit) return null;
    dest = text.slice(i + 1, close);
    i = close + 1;
  } else {
    const destStart = i;
    let depth = 0;
    while (i < limit) {
      const c = text[i]!;
      if (c === "\\" && i + 1 < limit) {
        i += 2;
        continue;
      }
      if (WHITESPACE.test(c)) break;
      if (c === "(") depth++;
      else if (c === ")") {
        if (depth === 0) break;
        depth--;
      }
      i++;
    }
    dest = text.slice(destStart, i);
  }

  while (i < limit && WHITESPACE.test(text[i]!)) i++;

  const quote = text[i];
  if (quote === '"' || quote === "'" || quote === "(") {
    const closeChar = quote === "(" ? ")" : quote;
    let j = i + 1;
    while (j < limit && text[j] !== closeChar) {
      if (text[j] === "\\") j++;
      j++;
    }
    if (j >= limit) return null;
    i = j + 1;
    while (i < limit && WHITESPACE.test(text[i]!)) i++;
  }

  if (i >= limit || text[i] !== ")") return null;
  return { dest: unescapeMarkdown(dest), end: i + 1 };
}

function sameMarks(a: InlineMark[], b: InlineMark[]): boolean {
  return a.length === b.length && a.every((mark, i) => mark.type === b[i]!.type && mark.href === b[i]!.href);
}

function tokenize(text: string, depth: number): Node[] {
  const nodes: Node[] = [];
  let buf = "";
  const flush = () => {
    if (buf) {
      nodes.push({ kind: "text", text: buf, marks: [] });
      buf = "";
    }
  };

  const backticks = new BacktickIndex(text);
  const brackets = depth < MAX_DEPTH && text.includes("[") ? matchBrackets(text, backticks) : null;

  let i = 0;
  while (i < text.length) {
    const c = text[i]!;

    if (c === "\\") {
      const next = text[i + 1];
      if (next !== undefined && ASCII_PUNCT.test(next)) {
        buf += next;
        i += 2;
      } else {
        buf += c;
        i += 1;
      }
      continue;
    }

    if (c === "`") {
      let n = 1;
      while (text[i + n] === "`") n++;
      const close = backticks.findClose(i + n, n);
      if (close === -1) {
        buf += "`".repeat(n);
        i += n;
        continue;
      }
      let code = text.slice(i + n, close);
      if (code.length >= 2 && code.startsWith(" ") && code.endsWith(" ") && code.trim() !== "") {
        code = code.slice(1, -1);
      }
      flush();
      nodes.push({ kind: "text", text: code, marks: [{ type: "code" }] });
      i = close + n;
      continue;
    }

    if (brackets && (c === "[" || (c === "!" && text[i + 1] === "["))) {
      const isImage = c === "!";
      const open = isImage ? i + 1 : i;
      const close = brackets.get(open);
      if (close !== undefined && text[close + 1] === "(") {
        const tail = parseLinkTail(text, close + 1);
        if (tail) {
          const inner = parseRuns(text.slice(open + 1, close), depth + 1);
          flush();
          // An image has no inline representation in the block model, so only its alt text is kept.
          const href = isImage ? null : sanitizeUrl(tail.dest);
          for (const run of inner) {
            const alreadyLinked = run.marks.some((m) => m.type === "link");
            const marks = href && !alreadyLinked ? [{ type: "link" as const, href }, ...run.marks] : run.marks;
            nodes.push({ kind: "text", text: run.text, marks });
          }
          i = tail.end;
          continue;
        }
      }
    }

    if (c === "<") {
      AUTOLINK.lastIndex = i;
      const auto = AUTOLINK.exec(text);
      if (auto) {
        const href = sanitizeUrl(auto[1]!);
        flush();
        nodes.push({ kind: "text", text: auto[1]!, marks: href ? [{ type: "link", href }] : [] });
        i += auto[0].length;
        continue;
      }
      if (text.startsWith("<u>", i) || text.startsWith("</u>", i)) {
        const opening = text[i + 1] === "u";
        const raw = opening ? "<u>" : "</u>";
        flush();
        nodes.push({
          kind: "delim",
          ch: "u",
          count: 1,
          origCount: 1,
          canOpen: opening,
          canClose: !opening,
          raw,
          marks: [],
        });
        i += raw.length;
        continue;
      }
    }

    if (c === "*" || c === "_" || c === "~") {
      let n = 1;
      while (text[i + n] === c) n++;
      if (c === "~" && n !== 2) {
        buf += c.repeat(n);
        i += n;
        continue;
      }
      const before = text[i - 1];
      const after = text[i + n];
      const left = !isWs(after) && (!isPunct(after) || isWs(before) || isPunct(before));
      const right = !isWs(before) && (!isPunct(before) || isWs(after) || isPunct(after));
      const canOpen = c === "_" ? left && (!right || isPunct(before)) : left;
      const canClose = c === "_" ? right && (!left || isPunct(after)) : right;
      if (!canOpen && !canClose) {
        buf += c.repeat(n);
        i += n;
        continue;
      }
      flush();
      nodes.push({ kind: "delim", ch: c, count: n, origCount: n, canOpen, canClose, raw: c.repeat(n), marks: [] });
      i += n;
      continue;
    }

    buf += c;
    i++;
  }

  flush();
  return nodes;
}

type EmphasisType = "bold" | "italic" | "underline" | "strikethrough";

// Fixed order, so equal formatting always yields equal (and mergeable) mark lists.
const EMPHASIS_ORDER: EmphasisType[] = ["bold", "italic", "underline", "strikethrough"];

function emphasisFor(ch: DelimNode["ch"], use: number): EmphasisType {
  if (ch === "~") return "strikethrough";
  if (ch === "u") return "underline";
  return use === 2 ? "bold" : "italic";
}

/**
 * CommonMark's process_emphasis. Matched pairs are recorded as spans over node indices and applied
 * in one sweep at the end, so deeply nested input stays linear instead of re-stamping every node
 * once per enclosing pair.
 */
function resolveDelimiters(nodes: Node[]): void {
  const openersBottom = new Map<string, number>();
  const spans: Array<{ from: number; to: number; type: EmphasisType }> = [];
  const stack: number[] = []; // indices of delimiter nodes that can still open, ascending

  for (let ci = 0; ci < nodes.length; ci++) {
    const closer = nodes[ci]!;
    if (closer.kind !== "delim" || closer.count === 0) continue;

    if (closer.canClose) {
      const key = `${closer.ch}${closer.canOpen ? 1 : 0}${closer.origCount % 3}`;
      const bottom = openersBottom.get(key) ?? -1;

      while (closer.count > 0) {
        let found = -1;
        for (let s = stack.length - 1; s >= 0; s--) {
          const oi = stack[s]!;
          if (oi <= bottom) break;
          const opener = nodes[oi] as DelimNode;
          if (opener.ch !== closer.ch || opener.count === 0) continue;
          if (
            (closer.ch === "*" || closer.ch === "_") &&
            (opener.canClose || closer.canOpen) &&
            (opener.origCount + closer.origCount) % 3 === 0 &&
            !(opener.origCount % 3 === 0 && closer.origCount % 3 === 0)
          ) {
            continue;
          }
          found = s;
          break;
        }

        if (found === -1) {
          openersBottom.set(key, ci - 1);
          break;
        }

        const openerIndex = stack[found]!;
        const opener = nodes[openerIndex] as DelimNode;
        const use = closer.ch === "~" ? 2 : closer.ch === "u" ? 1 : opener.count >= 2 && closer.count >= 2 ? 2 : 1;
        spans.push({ from: openerIndex, to: ci, type: emphasisFor(closer.ch, use) });

        // Delimiters between the pair can never match anything now.
        stack.length = found + 1;
        opener.count -= use;
        closer.count -= use;
        if (opener.count === 0) stack.pop();
      }
    }

    if (closer.canOpen && closer.count > 0) stack.push(ci);
  }

  if (spans.length === 0) return;

  const diffs = new Map<EmphasisType, Int32Array>();
  for (const { from, to, type } of spans) {
    let diff = diffs.get(type);
    if (!diff) {
      diff = new Int32Array(nodes.length + 1);
      diffs.set(type, diff);
    }
    diff[from + 1]! += 1;
    diff[to]! -= 1;
  }

  const depth = new Map<EmphasisType, number>();
  for (let k = 0; k < nodes.length; k++) {
    const marks: InlineMark[] = [];
    for (const type of EMPHASIS_ORDER) {
      const diff = diffs.get(type);
      if (!diff) continue;
      const d = (depth.get(type) ?? 0) + diff[k]!;
      depth.set(type, d);
      if (d > 0) marks.push({ type });
    }
    if (marks.length > 0) nodes[k]!.marks = [...marks, ...nodes[k]!.marks];
  }
}

function toRuns(nodes: Node[]): InlineContent[] {
  const runs: InlineContent[] = [];
  for (const node of nodes) {
    const text =
      node.kind === "text" ? node.text : node.count === 0 ? "" : node.ch === "u" ? node.raw : node.ch.repeat(node.count);
    if (!text) continue;
    const last = runs[runs.length - 1];
    if (last && sameMarks(last.marks, node.marks)) last.text += text;
    else runs.push({ type: "text", text, marks: node.marks });
  }
  return runs;
}

function parseRuns(text: string, depth: number): InlineContent[] {
  const nodes = tokenize(text, depth);
  resolveDelimiters(nodes);
  return toRuns(nodes);
}

/** Parses one line/paragraph of inline Markdown (newlines should already be joined to spaces). */
export function parseInline(text: string): InlineContent[] {
  return parseRuns(text, 0);
}

export function plainText(runs: InlineContent[]): string {
  return runs.map((run) => run.text).join("");
}

/** Matches a line that is exactly one image, `![alt](src "title")`. */
export function parseImageLine(line: string): { alt: string; src: string } | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith("![")) return null;
  const close = matchBrackets(trimmed, new BacktickIndex(trimmed)).get(1);
  if (close === undefined || trimmed[close + 1] !== "(") return null;
  const tail = parseLinkTail(trimmed, close + 1);
  if (!tail || tail.end !== trimmed.length) return null;
  return {
    alt: plainText(parseRuns(trimmed.slice(2, close), 1)),
    src: sanitizeUrl(tail.dest, "image") ?? "",
  };
}
