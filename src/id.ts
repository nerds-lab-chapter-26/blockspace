import type { BlockId } from "./types.js";

export function generateBlockId(): BlockId {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `blk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
