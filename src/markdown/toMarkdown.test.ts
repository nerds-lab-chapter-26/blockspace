import { describe, expect, it } from "vitest";
import { documentToMarkdown } from "./toMarkdown.js";
import { createDefaultRegistry } from "../blocks/index.js";
import { createBlockRegistry, defineBlock } from "../registry.js";
import type { Block, BlockDocument, InlineContent } from "../types.js";

function text(t: string): InlineContent[] {
  return [{ type: "text", text: t, marks: [] }];
}

function doc(blocks: Block[]): BlockDocument {
  return { version: 1, blocks };
}

describe("documentToMarkdown", () => {
  it("renders headings with the right number of #", () => {
    const d = doc([{ id: "a", type: "heading", props: { level: 2 }, content: text("Title") }]);
    expect(documentToMarkdown(d)).toBe("## Title\n");
  });

  it("renders inline marks", () => {
    const d = doc([
      {
        id: "a",
        type: "paragraph",
        props: {},
        content: [
          { type: "text", text: "bold", marks: [{ type: "bold" }] },
          { type: "text", text: " and ", marks: [] },
          { type: "text", text: "a link", marks: [{ type: "link", href: "https://example.com" }] },
        ],
      },
    ]);
    expect(documentToMarkdown(d)).toBe("**bold** and [a link](https://example.com)\n");
  });

  it("renders a checked and unchecked todo", () => {
    const d = doc([
      { id: "a", type: "todo", props: { checked: true }, content: text("done") },
      { id: "b", type: "todo", props: { checked: false }, content: text("not done") },
    ]);
    expect(documentToMarkdown(d)).toBe("- [x] done\n\n- [ ] not done\n");
  });

  it("renders numbered list items with sequential numbering that resets after an interruption", () => {
    const d = doc([
      { id: "a", type: "numberedListItem", props: {}, content: text("one") },
      { id: "b", type: "numberedListItem", props: {}, content: text("two") },
      { id: "c", type: "paragraph", props: {}, content: text("break") },
      { id: "e", type: "numberedListItem", props: {}, content: text("restarts") },
    ]);
    expect(documentToMarkdown(d)).toBe("1. one\n\n2. two\n\nbreak\n\n1. restarts\n");
  });

  it("indents nested list children", () => {
    const d = doc([
      {
        id: "a",
        type: "bulletedListItem",
        props: {},
        content: text("parent"),
        children: [{ id: "a1", type: "bulletedListItem", props: {}, content: text("child") }],
      },
    ]);
    expect(documentToMarkdown(d)).toBe("- parent\n\n  - child\n");
  });

  it("renders code blocks as fenced code with the language tag", () => {
    const d = doc([{ id: "a", type: "code", props: { language: "js", code: "let x = 1;" } }]);
    expect(documentToMarkdown(d)).toBe("```js\nlet x = 1;\n```\n");
  });

  it("renders a divider as a thematic break", () => {
    const d = doc([{ id: "a", type: "divider", props: {} }]);
    expect(documentToMarkdown(d)).toBe("---\n");
  });

  it("renders an image with alt text and an italic caption", () => {
    const d = doc([
      { id: "a", type: "image", props: { src: "cat.png", alt: "a cat", caption: "My cat" } },
    ]);
    expect(documentToMarkdown(d)).toBe("![a cat](cat.png)\n*My cat*\n");
  });

  it("falls back to plain text for an unregistered custom block type", () => {
    const d = doc([{ id: "a", type: "myCustomBlock", props: {}, content: text("hello") }]);
    expect(documentToMarkdown(d)).toBe("hello\n");
  });

  it("falls back to an HTML comment for an unregistered, contentless custom block", () => {
    const d = doc([{ id: "a", type: "myCustomBlock", props: {} }]);
    expect(documentToMarkdown(d)).toBe('<!-- unsupported block type: "myCustomBlock" -->\n');
  });

  it("uses a custom block's own toMarkdown when a registry defines one", () => {
    const registry = createBlockRegistry([
      defineBlock({
        type: "rating",
        defaultProps: { stars: 0 },
        toMarkdown: (props) => `Rating: ${"⭐".repeat(Number(props.stars) || 0)}`,
        render: () => null,
        edit: () => null,
      }),
    ]);
    const d = doc([{ id: "a", type: "rating", props: { stars: 3 } }]);
    expect(documentToMarkdown(d, registry)).toBe("Rating: ⭐⭐⭐\n");
  });

  it("round-trips every default V1 block type without throwing", () => {
    const registry = createDefaultRegistry();
    for (const def of registry.list()) {
      const d = doc([{ id: "x", type: def.type, props: def.defaultProps, content: text("hi") }]);
      expect(() => documentToMarkdown(d, registry)).not.toThrow();
    }
  });

  it("returns an empty string for an empty document", () => {
    expect(documentToMarkdown(doc([]))).toBe("");
  });
});
