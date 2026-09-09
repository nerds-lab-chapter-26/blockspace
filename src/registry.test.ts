import { describe, expect, it } from "vitest";
import { createBlockRegistry, defineBlock } from "./registry.js";

const stub = () => null;

function fakeBlock(type: string) {
  return defineBlock({
    type,
    defaultProps: {},
    render: stub as never,
    edit: stub as never,
  });
}

describe("defineBlock", () => {
  it("rejects a missing type", () => {
    expect(() =>
      defineBlock({ type: "", defaultProps: {}, render: stub as never, edit: stub as never })
    ).toThrow(/type/);
  });
});

describe("createBlockRegistry", () => {
  it("registers and retrieves blocks by type", () => {
    const registry = createBlockRegistry([fakeBlock("paragraph")]);
    expect(registry.has("paragraph")).toBe(true);
    expect(registry.get("paragraph")?.type).toBe("paragraph");
    expect(registry.get("missing")).toBeUndefined();
  });

  it("throws a helpful error on duplicate registration", () => {
    const registry = createBlockRegistry([fakeBlock("paragraph")]);
    expect(() => registry.register(fakeBlock("paragraph"))).toThrow(/paragraph/);
  });

  it("lists all registered blocks", () => {
    const registry = createBlockRegistry([fakeBlock("a"), fakeBlock("b")]);
    expect(registry.list().map((b) => b.type)).toEqual(["a", "b"]);
  });
});
