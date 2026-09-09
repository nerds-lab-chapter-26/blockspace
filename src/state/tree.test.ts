import { describe, expect, it } from "vitest";
import type { Block, BlockDocument } from "../types.js";
import {
  convertBlock,
  findBlock,
  flatten,
  indentBlock,
  insertBlock,
  moveBlock,
  outdentBlock,
  removeBlock,
  updateBlockData,
} from "./tree.js";

function block(id: string, type = "paragraph", children: Block[] = []): Block {
  return { id, type, props: {}, content: [], children };
}

function doc(blocks: Block[]): BlockDocument {
  return { version: 1, blocks };
}

describe("insertBlock", () => {
  it("inserts at root start and end", () => {
    const d = doc([block("a")]);
    const withStart = insertBlock(d, block("z"), { type: "root-start" });
    expect(withStart.blocks.map((b) => b.id)).toEqual(["z", "a"]);

    const withEnd = insertBlock(d, block("z"), { type: "root-end" });
    expect(withEnd.blocks.map((b) => b.id)).toEqual(["a", "z"]);
  });

  it("inserts after and before a sibling anywhere in the tree", () => {
    const d = doc([block("a", "paragraph", [block("a1")])]);
    const after = insertBlock(d, block("a2"), { type: "after", id: "a1" });
    expect(after.blocks[0]!.children?.map((b) => b.id)).toEqual(["a1", "a2"]);

    const before = insertBlock(d, block("a0"), { type: "before", id: "a1" });
    expect(before.blocks[0]!.children?.map((b) => b.id)).toEqual(["a0", "a1"]);
  });

  it("inserts as the last child of a target block", () => {
    const d = doc([block("a")]);
    const result = insertBlock(d, block("a1"), { type: "child-end", id: "a" });
    expect(result.blocks[0]!.children?.map((b) => b.id)).toEqual(["a1"]);
  });
});

describe("removeBlock", () => {
  it("removes a nested block and returns it", () => {
    const d = doc([block("a", "paragraph", [block("a1")])]);
    const { doc: next, removed } = removeBlock(d, "a1");
    expect(removed?.id).toBe("a1");
    expect(next.blocks[0]!.children).toEqual([]);
  });

  it("returns removed: null when the id does not exist", () => {
    const d = doc([block("a")]);
    const { removed } = removeBlock(d, "missing");
    expect(removed).toBeNull();
  });
});

describe("moveBlock", () => {
  it("relocates a block from one parent to another", () => {
    const d = doc([block("a", "paragraph", [block("a1")]), block("b")]);
    const next = moveBlock(d, "a1", { type: "child-end", id: "b" });
    expect(next.blocks[0]!.children).toEqual([]);
    expect(next.blocks[1]!.children?.map((b) => b.id)).toEqual(["a1"]);
  });
});

describe("indentBlock / outdentBlock", () => {
  it("indents a block under its previous sibling", () => {
    const d = doc([block("a"), block("b")]);
    const next = indentBlock(d, "b");
    expect(next.blocks.map((b) => b.id)).toEqual(["a"]);
    expect(next.blocks[0]!.children?.map((b) => b.id)).toEqual(["b"]);
  });

  it("is a no-op for the first block in its list", () => {
    const d = doc([block("a"), block("b")]);
    const next = indentBlock(d, "a");
    expect(next).toEqual(d);
  });

  it("outdents a nested block to become its parent's next sibling", () => {
    const d = doc([block("a", "paragraph", [block("a1")]), block("b")]);
    const next = outdentBlock(d, "a1");
    expect(next.blocks.map((b) => b.id)).toEqual(["a", "a1", "b"]);
  });

  it("is a no-op at the root", () => {
    const d = doc([block("a")]);
    const next = outdentBlock(d, "a");
    expect(next).toEqual(d);
  });
});

describe("convertBlock and updateBlockData", () => {
  it("changes a block's type and props", () => {
    const d = doc([block("a", "paragraph")]);
    const next = convertBlock(d, "a", "heading", { level: 2 });
    expect(next.blocks[0]!.type).toBe("heading");
    expect(next.blocks[0]!.props).toEqual({ level: 2 });
  });

  it("updates arbitrary block data via a callback", () => {
    const d = doc([block("a")]);
    const next = updateBlockData(d, "a", (b) => ({ ...b, props: { checked: true } }));
    expect(next.blocks[0]!.props).toEqual({ checked: true });
  });
});

describe("findBlock", () => {
  it("locates a block anywhere in the tree with its context", () => {
    const d = doc([block("a", "paragraph", [block("a1")])]);
    const entry = findBlock(d, "a1");
    expect(entry?.parent?.id).toBe("a");
    expect(entry?.index).toBe(0);
  });

  it("returns null for an unknown id", () => {
    const d = doc([block("a")]);
    expect(findBlock(d, "nope")).toBeNull();
  });
});

describe("flatten", () => {
  it("produces a depth-annotated, ordered list", () => {
    const d = doc([block("a", "paragraph", [block("a1")]), block("b")]);
    const flat = flatten(d);
    expect(flat.map((f) => [f.block.id, f.depth])).toEqual([
      ["a", 0],
      ["a1", 1],
      ["b", 0],
    ]);
  });
});
