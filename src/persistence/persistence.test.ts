import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BlockDocument } from "../types.js";
import { createMemoryAdapter } from "./memoryAdapter.js";
import { createLocalStorageAdapter } from "./localStorageAdapter.js";
import { createSaveController } from "./autosave.js";
import type { PersistenceAdapter } from "./types.js";

const doc: BlockDocument = { version: 1, blocks: [{ id: "a", type: "paragraph", props: {} }] };

describe("createMemoryAdapter", () => {
  it("round-trips a saved document", async () => {
    const adapter = createMemoryAdapter();
    expect(await adapter.load("doc-1")).toBeNull();
    await adapter.save("doc-1", doc);
    expect(await adapter.load("doc-1")).toEqual(doc);
  });

  it("returns independent copies, not shared references", async () => {
    const adapter = createMemoryAdapter();
    await adapter.save("doc-1", doc);
    const loaded = await adapter.load("doc-1");
    loaded!.blocks.push({ id: "mutated", type: "paragraph", props: {} });
    expect(await adapter.load("doc-1")).toEqual(doc);
  });

  it("deletes a document", async () => {
    const adapter = createMemoryAdapter();
    await adapter.save("doc-1", doc);
    await adapter.delete!("doc-1");
    expect(await adapter.load("doc-1")).toBeNull();
  });
});

describe("createLocalStorageAdapter", () => {
  beforeEach(() => window.localStorage.clear());

  it("round-trips a saved document as JSON", async () => {
    const adapter = createLocalStorageAdapter();
    await adapter.save("doc-1", doc);
    expect(await adapter.load("doc-1")).toEqual(doc);
  });

  it("namespaces keys with a prefix", async () => {
    const adapter = createLocalStorageAdapter({ keyPrefix: "myapp:" });
    await adapter.save("doc-1", doc);
    expect(window.localStorage.getItem("myapp:doc-1")).not.toBeNull();
  });

  it("throws a clear error on corrupted stored JSON", async () => {
    window.localStorage.setItem("blockspace:doc-1", "{not json");
    const adapter = createLocalStorageAdapter();
    await expect(adapter.load("doc-1")).rejects.toThrow(/not valid JSON/);
  });
});

describe("createSaveController", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("debounces rapid saves into one adapter call", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const adapter: PersistenceAdapter = { load: vi.fn(), save };
    const controller = createSaveController(adapter, "doc-1", 300);

    controller.scheduleSave(doc);
    controller.scheduleSave(doc);
    controller.scheduleSave(doc);

    await vi.advanceTimersByTimeAsync(300);
    expect(save).toHaveBeenCalledTimes(1);
    expect(controller.getStatus()).toBe("saved");
  });

  it("reports an error status without throwing, and keeps working after", async () => {
    const save = vi.fn().mockRejectedValueOnce(new Error("network down")).mockResolvedValue(undefined);
    const adapter: PersistenceAdapter = { load: vi.fn(), save };
    const controller = createSaveController(adapter, "doc-1", 100);
    const statuses: string[] = [];
    controller.subscribe((s) => statuses.push(s));

    controller.scheduleSave(doc);
    await vi.advanceTimersByTimeAsync(100);
    expect(controller.getStatus()).toBe("error");

    controller.scheduleSave(doc);
    await vi.advanceTimersByTimeAsync(100);
    expect(controller.getStatus()).toBe("saved");
    expect(statuses).toEqual(["saving", "error", "saving", "saved"]);
  });

  it("flush saves immediately, bypassing the debounce", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const adapter: PersistenceAdapter = { load: vi.fn(), save };
    const controller = createSaveController(adapter, "doc-1", 10_000);

    controller.scheduleSave(doc);
    await controller.flush();
    expect(save).toHaveBeenCalledTimes(1);
  });
});
