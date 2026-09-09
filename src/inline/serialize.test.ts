import { describe, expect, it } from "vitest";
import {
  domToInline,
  inlineToText,
  mergeInline,
  splitInline,
} from "./serialize.js";
import type { InlineContent } from "../types.js";

function parse(html: string) {
  const div = document.createElement("div");
  div.innerHTML = html;
  return domToInline(div);
}

describe("domToInline", () => {
  it("reads plain text", () => {
    expect(parse("hello world")).toEqual([
      { type: "text", text: "hello world", marks: [] },
    ]);
  });

  it("reads bold and italic marks", () => {
    const result = parse("plain <strong>bold</strong> <em>italic</em>");
    expect(result).toEqual([
      { type: "text", text: "plain ", marks: [] },
      { type: "text", text: "bold", marks: [{ type: "bold" }] },
      { type: "text", text: " ", marks: [] },
      { type: "text", text: "italic", marks: [{ type: "italic" }] },
    ]);
  });

  it("reads nested marks", () => {
    const result = parse("<strong><em>both</em></strong>");
    expect(result).toEqual([
      { type: "text", text: "both", marks: [{ type: "bold" }, { type: "italic" }] },
    ]);
  });

  it("reads link href", () => {
    const result = parse('<a href="https://example.com">link</a>');
    expect(result).toEqual([
      {
        type: "text",
        text: "link",
        marks: [{ type: "link", href: "https://example.com" }],
      },
    ]);
  });

  it("ignores <br> and merges adjacent runs with identical marks", () => {
    const result = parse("<strong>a</strong><strong>b</strong>");
    expect(result).toEqual([{ type: "text", text: "ab", marks: [{ type: "bold" }] }]);
  });
});

describe("inlineToText", () => {
  it("concatenates run text", () => {
    const content: InlineContent[] = [
      { type: "text", text: "foo ", marks: [] },
      { type: "text", text: "bar", marks: [{ type: "bold" }] },
    ];
    expect(inlineToText(content)).toBe("foo bar");
  });

  it("returns empty string for undefined", () => {
    expect(inlineToText(undefined)).toBe("");
  });
});

describe("splitInline", () => {
  it("splits a single run at the given offset", () => {
    const content: InlineContent[] = [{ type: "text", text: "hello world", marks: [] }];
    const [before, after] = splitInline(content, 5);
    expect(inlineToText(before)).toBe("hello");
    expect(inlineToText(after)).toBe(" world");
  });

  it("splits across multiple runs, preserving marks", () => {
    const content: InlineContent[] = [
      { type: "text", text: "abc", marks: [] },
      { type: "text", text: "def", marks: [{ type: "bold" }] },
    ];
    const [before, after] = splitInline(content, 4);
    expect(before).toEqual([
      { type: "text", text: "abc", marks: [] },
      { type: "text", text: "d", marks: [{ type: "bold" }] },
    ]);
    expect(after).toEqual([{ type: "text", text: "ef", marks: [{ type: "bold" }] }]);
  });
});

describe("mergeInline", () => {
  it("concatenates runs and merges matching trailing/leading marks", () => {
    const a: InlineContent[] = [{ type: "text", text: "foo", marks: [] }];
    const b: InlineContent[] = [{ type: "text", text: "bar", marks: [] }];
    expect(mergeInline(a, b)).toEqual([{ type: "text", text: "foobar", marks: [] }]);
  });

  it("keeps runs separate when marks differ", () => {
    const a: InlineContent[] = [{ type: "text", text: "foo", marks: [] }];
    const b: InlineContent[] = [{ type: "text", text: "bar", marks: [{ type: "bold" }] }];
    expect(mergeInline(a, b)).toEqual([
      { type: "text", text: "foo", marks: [] },
      { type: "text", text: "bar", marks: [{ type: "bold" }] },
    ]);
  });
});
