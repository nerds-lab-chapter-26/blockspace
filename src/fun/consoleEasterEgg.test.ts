import { beforeEach, describe, expect, it, vi } from "vitest";

describe("printConsoleEasterEgg", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("prints exactly once even if called multiple times", async () => {
    const { printConsoleEasterEgg } = await import("./consoleEasterEgg.js");
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    printConsoleEasterEgg();
    printConsoleEasterEgg();
    printConsoleEasterEgg();

    expect(spy).toHaveBeenCalledTimes(1);
    expect(String(spy.mock.calls[0]?.[0])).toContain("space2space");
    spy.mockRestore();
  });
});

describe("randomFrom", () => {
  it("always returns an item from the given list", async () => {
    const { randomFrom } = await import("./quotes.js");
    const list = ["a", "b", "c"];
    for (let i = 0; i < 20; i++) {
      expect(list).toContain(randomFrom(list));
    }
  });
});
