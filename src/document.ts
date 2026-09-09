import { BlockDocument, DOCUMENT_SCHEMA_VERSION } from "./types.js";

export function createEmptyDocument(): BlockDocument {
  return {
    version: DOCUMENT_SCHEMA_VERSION,
    blocks: [],
  };
}

export function isBlockDocument(value: unknown): value is BlockDocument {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    candidate.version === DOCUMENT_SCHEMA_VERSION &&
    Array.isArray(candidate.blocks)
  );
}
