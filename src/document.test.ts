import { describe, expect, it } from "vitest";
import { createEmptyDocument, isBlockDocument } from "./document.js";

describe("createEmptyDocument", () => {
  it("returns a versioned document with no blocks", () => {
    const doc = createEmptyDocument();
    expect(doc.version).toBe(1);
    expect(doc.blocks).toEqual([]);
  });
});

describe("isBlockDocument", () => {
  it("accepts a well-formed document", () => {
    expect(isBlockDocument(createEmptyDocument())).toBe(true);
  });

  it("rejects documents with the wrong schema version", () => {
    expect(isBlockDocument({ version: 2, blocks: [] })).toBe(false);
  });

  it("rejects non-object input", () => {
    expect(isBlockDocument(null)).toBe(false);
    expect(isBlockDocument("blockspace")).toBe(false);
  });
});
