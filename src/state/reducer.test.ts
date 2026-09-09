import { describe, expect, it } from "vitest";
import type { Block, BlockDocument } from "../types.js";
import { createInitialEditorState, editorReducer } from "./reducer.js";

function block(id: string, type = "paragraph"): Block {
  return { id, type, props: {}, content: [] };
}

function doc(blocks: Block[]): BlockDocument {
  return { version: 1, blocks };
}

describe("editorReducer", () => {
  it("applies an insert action", () => {
    const state = createInitialEditorState(doc([block("a")]));
    const next = editorReducer(state, {
      type: "insert",
      block: block("b"),
      location: { type: "root-end" },
    });
    expect(next.document.blocks.map((b) => b.id)).toEqual(["a", "b"]);
  });

  it("undo reverts the last structural change and redo reapplies it", () => {
    let state = createInitialEditorState(doc([block("a")]));
    state = editorReducer(state, {
      type: "insert",
      block: block("b"),
      location: { type: "root-end" },
    });
    expect(state.document.blocks.map((b) => b.id)).toEqual(["a", "b"]);

    state = editorReducer(state, { type: "undo" });
    expect(state.document.blocks.map((b) => b.id)).toEqual(["a"]);

    state = editorReducer(state, { type: "redo" });
    expect(state.document.blocks.map((b) => b.id)).toEqual(["a", "b"]);
  });

  it("undo is a no-op with empty history", () => {
    const state = createInitialEditorState(doc([block("a")]));
    const next = editorReducer(state, { type: "undo" });
    expect(next).toBe(state);
  });

  it("a new action after undo clears redo history", () => {
    let state = createInitialEditorState(doc([block("a")]));
    state = editorReducer(state, {
      type: "insert",
      block: block("b"),
      location: { type: "root-end" },
    });
    state = editorReducer(state, { type: "undo" });
    state = editorReducer(state, {
      type: "insert",
      block: block("c"),
      location: { type: "root-end" },
    });
    expect(state.future).toEqual([]);
    expect(state.document.blocks.map((b) => b.id)).toEqual(["a", "c"]);
  });

  it("coalesces consecutive content updates to the same block into one undo step", () => {
    let state = createInitialEditorState(doc([block("a")]));
    state = editorReducer(state, {
      type: "update",
      id: "a",
      patch: { content: [{ type: "text", text: "h", marks: [] }] },
    });
    state = editorReducer(state, {
      type: "update",
      id: "a",
      patch: { content: [{ type: "text", text: "he", marks: [] }] },
    });
    state = editorReducer(state, {
      type: "update",
      id: "a",
      patch: { content: [{ type: "text", text: "hey", marks: [] }] },
    });
    expect(state.past).toHaveLength(1);

    state = editorReducer(state, { type: "undo" });
    expect(state.document.blocks[0]!.content).toEqual([]);
  });

  it("does not coalesce updates across different blocks", () => {
    let state = createInitialEditorState(doc([block("a"), block("b")]));
    state = editorReducer(state, {
      type: "update",
      id: "a",
      patch: { content: [{ type: "text", text: "x", marks: [] }] },
    });
    state = editorReducer(state, {
      type: "update",
      id: "b",
      patch: { content: [{ type: "text", text: "y", marks: [] }] },
    });
    expect(state.past).toHaveLength(2);
  });

  it("set replaces the document and clears history", () => {
    let state = createInitialEditorState(doc([block("a")]));
    state = editorReducer(state, {
      type: "insert",
      block: block("b"),
      location: { type: "root-end" },
    });
    state = editorReducer(state, { type: "set", document: doc([block("z")]) });
    expect(state.document.blocks.map((b) => b.id)).toEqual(["z"]);
    expect(state.past).toEqual([]);
    expect(state.future).toEqual([]);
  });
});
