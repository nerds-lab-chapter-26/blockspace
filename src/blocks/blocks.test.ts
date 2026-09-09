import { describe, expect, it } from "vitest";
import { buildSlashMenuEntries, createBlockRegistry, isBlockEmpty } from "../registry.js";
import { createDefaultRegistry, defaultBlocks } from "./index.js";

describe("defaultBlocks", () => {
  it("registers all 10 V1 block types with unique type names", () => {
    expect(defaultBlocks).toHaveLength(10);
    const types = new Set(defaultBlocks.map((b) => b.type));
    expect(types.size).toBe(10);
  });

  it("createDefaultRegistry registers every default block without throwing", () => {
    const registry = createDefaultRegistry();
    for (const def of defaultBlocks) {
      expect(registry.has(def.type)).toBe(true);
    }
  });

  it("registering a second registry from scratch does not collide with the first", () => {
    // regression check: createDefaultRegistry() must build a fresh registry each call
    expect(() => createDefaultRegistry()).not.toThrow();
    expect(() => createDefaultRegistry()).not.toThrow();
  });
});

describe("buildSlashMenuEntries with the default registry", () => {
  it("expands heading into three variants and keeps single-entry blocks singular", () => {
    const entries = buildSlashMenuEntries(createDefaultRegistry());
    const headingEntries = entries.filter((e) => e.type === "heading");
    expect(headingEntries.map((e) => e.label)).toEqual(["Heading 1", "Heading 2", "Heading 3"]);
    expect(headingEntries.map((e) => e.props.level)).toEqual([1, 2, 3]);

    const paragraphEntries = entries.filter((e) => e.type === "paragraph");
    expect(paragraphEntries).toHaveLength(1);
  });

  it("every default block contributes at least one slash menu entry", () => {
    const entries = buildSlashMenuEntries(createDefaultRegistry());
    const coveredTypes = new Set(entries.map((e) => e.type));
    for (const def of defaultBlocks) {
      expect(coveredTypes.has(def.type)).toBe(true);
    }
  });

  it("returns an empty list for a registry with no slash-menu metadata", () => {
    const registry = createBlockRegistry();
    expect(buildSlashMenuEntries(registry)).toEqual([]);
  });
});

describe("isBlockEmpty with the default registry", () => {
  const registry = createDefaultRegistry();

  it("treats a paragraph with no content as empty", () => {
    expect(isBlockEmpty(registry.get("paragraph"), {}, [])).toBe(true);
    expect(isBlockEmpty(registry.get("paragraph"), {}, [{ type: "text", text: "hi", marks: [] }])).toBe(
      false
    );
  });

  it("treats a divider as never empty (it has no content to be empty)", () => {
    expect(isBlockEmpty(registry.get("divider"), {}, undefined)).toBe(false);
  });

  it("uses the code block's own isEmpty override based on props.code", () => {
    expect(isBlockEmpty(registry.get("code"), { code: "" }, undefined)).toBe(true);
    expect(isBlockEmpty(registry.get("code"), { code: "  " }, undefined)).toBe(true);
    expect(isBlockEmpty(registry.get("code"), { code: "x" }, undefined)).toBe(false);
  });
});
