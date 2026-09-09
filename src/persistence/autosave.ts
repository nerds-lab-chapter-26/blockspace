import type { BlockDocument } from "../types.js";
import type { PersistenceAdapter, SaveStatus } from "./types.js";

export interface SaveController {
  scheduleSave(document: BlockDocument): void;
  getStatus(): SaveStatus;
  subscribe(listener: (status: SaveStatus) => void): () => void;
  /** Saves immediately, bypassing the debounce. Useful on unmount or explicit "save now" actions. */
  flush(): Promise<void>;
  dispose(): void;
}

export function createSaveController(
  adapter: PersistenceAdapter,
  documentId: string,
  debounceMs = 400
): SaveController {
  let status: SaveStatus = "idle";
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: BlockDocument | null = null;
  const listeners = new Set<(status: SaveStatus) => void>();

  const setStatus = (next: SaveStatus) => {
    status = next;
    listeners.forEach((listener) => listener(next));
  };

  const performSave = async () => {
    if (!pending) return;
    const document = pending;
    pending = null;
    setStatus("saving");
    try {
      await adapter.save(documentId, document);
      setStatus("saved");
    } catch {
      // Deliberately does not touch the in-memory document: a failed save must never discard local edits.
      setStatus("error");
    }
  };

  return {
    scheduleSave(document) {
      pending = document;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        void performSave();
      }, debounceMs);
    },
    getStatus: () => status,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    async flush() {
      if (timer) clearTimeout(timer);
      timer = null;
      await performSave();
    },
    dispose() {
      if (timer) clearTimeout(timer);
      timer = null;
      listeners.clear();
    },
  };
}
