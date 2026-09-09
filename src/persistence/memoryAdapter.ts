import type { BlockDocument } from "../types.js";
import type { PersistenceAdapter } from "./types.js";

/** In-memory persistence adapter. Useful for tests and demos; state is lost on reload. */
export function createMemoryAdapter(): PersistenceAdapter {
  const store = new Map<string, BlockDocument>();

  return {
    async load(documentId) {
      const doc = store.get(documentId);
      return doc ? structuredClone(doc) : null;
    },
    async save(documentId, document) {
      store.set(documentId, structuredClone(document));
    },
    async delete(documentId) {
      store.delete(documentId);
    },
  };
}
