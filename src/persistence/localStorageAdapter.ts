import type { BlockDocument } from "../types.js";
import type { PersistenceAdapter } from "./types.js";

export interface LocalStorageAdapterOptions {
  /** Prefix applied to every localStorage key, so multiple apps can share one origin. Defaults to "blockspace:". */
  keyPrefix?: string;
}

export function createLocalStorageAdapter(
  options: LocalStorageAdapterOptions = {}
): PersistenceAdapter {
  const prefix = options.keyPrefix ?? "blockspace:";
  const keyFor = (documentId: string) => `${prefix}${documentId}`;

  return {
    async load(documentId) {
      if (typeof window === "undefined") return null;
      const raw = window.localStorage.getItem(keyFor(documentId));
      if (raw === null) return null;
      try {
        return JSON.parse(raw) as BlockDocument;
      } catch {
        throw new Error(
          `blockspace: stored document "${documentId}" is not valid JSON and could not be loaded.`
        );
      }
    },
    async save(documentId, document) {
      if (typeof window === "undefined") return;
      window.localStorage.setItem(keyFor(documentId), JSON.stringify(document));
    },
    async delete(documentId) {
      if (typeof window === "undefined") return;
      window.localStorage.removeItem(keyFor(documentId));
    },
  };
}
