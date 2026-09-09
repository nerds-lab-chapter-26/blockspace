import type { BlockDocument } from "../types.js";

export interface PersistenceAdapter {
  load(documentId: string): Promise<BlockDocument | null>;
  save(documentId: string, document: BlockDocument): Promise<void>;
  delete?(documentId: string): Promise<void>;
}

export type SaveStatus = "idle" | "saving" | "saved" | "error";
