import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BlockEditor } from "../react/BlockEditor.js";
import { BlockRenderer } from "../react/BlockRenderer.js";
import { createDefaultRegistry } from "../blocks/index.js";
import { markdownToDocument } from "./fromMarkdown.js";
import { documentToMarkdown } from "./toMarkdown.js";
import type { BlockDocument } from "../types.js";

const registry = createDefaultRegistry();

const SAMPLE = [
  "## Weekly plan",
  "",
  "Ship the **release notes** and read [the docs](https://example.com/docs).",
  "",
  "- [x] Write the changelog",
  "- [ ] Publish to npm",
  "",
  "1. First",
  "2. Second",
  "",
  "> 💡 Remember to tag the release",
  "",
  "```ts",
  "const shipped = true;",
  "```",
  "",
  "---",
  "",
  "![diagram](https://example.com/diagram.png)",
  "*The architecture*",
].join("\n");

describe("imported Markdown in BlockRenderer", () => {
  it("renders every block type it produced", () => {
    const { container } = render(<BlockRenderer document={markdownToDocument(SAMPLE)} registry={registry} />);

    expect(container.querySelector("h2")?.textContent).toBe("Weekly plan");
    expect(container.querySelector("strong")?.textContent).toBe("release notes");
    expect(container.querySelector('a[href="https://example.com/docs"]')?.textContent).toBe("the docs");

    const checkboxes = Array.from(container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'));
    expect(checkboxes.map((box) => box.checked)).toEqual([true, false]);

    expect(container.textContent).toContain("Write the changelog");
    expect(container.textContent).toContain("First");
    expect(container.textContent).toContain("Second");
    expect(container.textContent).toContain("Remember to tag the release");
    expect(container.querySelector("pre code")?.textContent).toBe("const shipped = true;");

    const image = container.querySelector("img");
    expect(image?.getAttribute("src")).toBe("https://example.com/diagram.png");
    expect(image?.getAttribute("alt")).toBe("diagram");
    expect(container.querySelector("figcaption")?.textContent).toBe("The architecture");
  });

  it("renders nothing dangerous from hostile Markdown", () => {
    const hostile = [
      "[click me](javascript:alert(1))",
      "",
      "[nested](<JaVa\tScRiPt:alert(2)>)",
      "",
      "![x](javascript:alert(3))",
      "",
      "<javascript:alert(4)>",
    ].join("\n");
    const { container } = render(<BlockRenderer document={markdownToDocument(hostile)} registry={registry} />);

    expect(container.querySelector("a")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
    expect(container.innerHTML).not.toMatch(/href="\s*javascript:/i);
    expect(container.innerHTML).not.toMatch(/src="\s*javascript:/i);
    expect(container.textContent).toContain("click me");
  });
});

describe("imported Markdown in BlockEditor", () => {
  it("loads into the editor and stays editable", () => {
    const onChange = vi.fn();
    const doc = markdownToDocument("# Title\n\n- item one\n  - nested item");
    const { container } = render(<BlockEditor registry={registry} value={doc} onChange={onChange} />);

    const editables = Array.from(container.querySelectorAll<HTMLElement>('[contenteditable="true"]'));
    expect(editables.map((el) => el.textContent)).toEqual(["Title", "item one", "nested item"]);

    editables[1]!.textContent = "item one, edited";
    fireEvent.input(editables[1]!);

    const latest = onChange.mock.calls[onChange.mock.calls.length - 1]![0] as BlockDocument;
    expect(latest.blocks).toHaveLength(2);
    expect(latest.blocks[1]!.content![0]!.text).toBe("item one, edited");
    expect(latest.blocks[1]!.children).toHaveLength(1);
    expect(latest.blocks[1]!.children![0]!.content![0]!.text).toBe("nested item");
  });

  it("round-trips through the editor's own Markdown export", () => {
    const doc = markdownToDocument(SAMPLE);
    const exported = documentToMarkdown(doc);
    const reimported = markdownToDocument(exported);
    expect(documentToMarkdown(reimported)).toBe(exported);
  });
});
