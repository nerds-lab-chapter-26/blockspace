import { describe, expect, it } from "vitest";
import { inlineToHtml } from "./html.js";
import { domToInline } from "./serialize.js";
import type { InlineContent } from "../types.js";

function roundTrip(content: InlineContent[]): InlineContent[] {
  const div = document.createElement("div");
  div.innerHTML = inlineToHtml(content);
  return domToInline(div);
}

describe("inlineToHtml", () => {
  it("round-trips plain text through domToInline", () => {
    const content: InlineContent[] = [{ type: "text", text: "hello", marks: [] }];
    expect(roundTrip(content)).toEqual(content);
  });

  it("round-trips nested marks", () => {
    const content: InlineContent[] = [
      { type: "text", text: "both", marks: [{ type: "bold" }, { type: "italic" }] },
    ];
    expect(roundTrip(content)).toEqual(content);
  });

  it("round-trips a link with href", () => {
    const content: InlineContent[] = [
      { type: "text", text: "site", marks: [{ type: "link", href: "https://example.com" }] },
    ];
    expect(roundTrip(content)).toEqual(content);
  });

  it("escapes HTML-significant characters", () => {
    const content: InlineContent[] = [{ type: "text", text: "<script>&\"", marks: [] }];
    expect(inlineToHtml(content)).toBe("&lt;script&gt;&amp;&quot;");
  });
});
