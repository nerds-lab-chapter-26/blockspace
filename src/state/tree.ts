import type { Block, BlockDocument, BlockId } from "../types.js";

export type BlockLocation =
  | { type: "root-start" }
  | { type: "root-end" }
  | { type: "after"; id: BlockId }
  | { type: "before"; id: BlockId }
  | { type: "child-end"; id: BlockId };

export interface BlockPathEntry {
  block: Block;
  parent: Block | null;
  siblings: Block[];
  index: number;
}

function walk(
  blocks: Block[],
  parent: Block | null,
  visit: (entry: BlockPathEntry) => void
): void {
  blocks.forEach((block, index) => {
    visit({ block, parent, siblings: blocks, index });
    if (block.children && block.children.length > 0) {
      walk(block.children, block, visit);
    }
  });
}

export function findBlock(doc: BlockDocument, id: BlockId): BlockPathEntry | null {
  let found: BlockPathEntry | null = null;
  walk(doc.blocks, null, (entry) => {
    if (!found && entry.block.id === id) found = entry;
  });
  return found;
}

export function findParentArray(doc: BlockDocument, id: BlockId): Block[] | null {
  const entry = findBlock(doc, id);
  return entry ? entry.siblings : null;
}

/** Returns a new document with `updater` applied to the array containing `id`. */
function updateContainingArray(
  blocks: Block[],
  id: BlockId,
  updater: (siblings: Block[]) => Block[]
): { blocks: Block[]; changed: boolean } {
  const index = blocks.findIndex((b) => b.id === id);
  if (index !== -1) {
    return { blocks: updater(blocks), changed: true };
  }
  let changed = false;
  const next = blocks.map((block) => {
    if (!block.children || block.children.length === 0) return block;
    const result = updateContainingArray(block.children, id, updater);
    if (result.changed) {
      changed = true;
      return { ...block, children: result.blocks };
    }
    return block;
  });
  return { blocks: changed ? next : blocks, changed };
}

export function updateBlockData(
  doc: BlockDocument,
  id: BlockId,
  updater: (block: Block) => Block
): BlockDocument {
  const result = updateContainingArray(doc.blocks, id, (siblings) =>
    siblings.map((b) => (b.id === id ? updater(b) : b))
  );
  return { ...doc, blocks: result.blocks };
}

export function removeBlock(
  doc: BlockDocument,
  id: BlockId
): { doc: BlockDocument; removed: Block | null } {
  let removed: Block | null = null;
  const result = updateContainingArray(doc.blocks, id, (siblings) => {
    removed = siblings.find((b) => b.id === id) ?? null;
    return siblings.filter((b) => b.id !== id);
  });
  return { doc: { ...doc, blocks: result.blocks }, removed };
}

function insertInto(blocks: Block[], index: number, block: Block): Block[] {
  const next = blocks.slice();
  next.splice(index, 0, block);
  return next;
}

export function insertBlock(
  doc: BlockDocument,
  block: Block,
  location: BlockLocation
): BlockDocument {
  switch (location.type) {
    case "root-start":
      return { ...doc, blocks: insertInto(doc.blocks, 0, block) };
    case "root-end":
      return { ...doc, blocks: insertInto(doc.blocks, doc.blocks.length, block) };
    case "after": {
      const result = updateContainingArray(doc.blocks, location.id, (siblings) => {
        const index = siblings.findIndex((b) => b.id === location.id);
        return insertInto(siblings, index + 1, block);
      });
      return { ...doc, blocks: result.blocks };
    }
    case "before": {
      const result = updateContainingArray(doc.blocks, location.id, (siblings) => {
        const index = siblings.findIndex((b) => b.id === location.id);
        return insertInto(siblings, index, block);
      });
      return { ...doc, blocks: result.blocks };
    }
    case "child-end": {
      const next = updateBlockData(doc, location.id, (parent) => ({
        ...parent,
        children: [...(parent.children ?? []), block],
      }));
      return next;
    }
    default:
      return doc;
  }
}

export function moveBlock(
  doc: BlockDocument,
  id: BlockId,
  location: BlockLocation
): BlockDocument {
  const { doc: withoutBlock, removed } = removeBlock(doc, id);
  if (!removed) return doc;
  return insertBlock(withoutBlock, removed, location);
}

/** Indents a block: makes it the last child of its previous sibling. No-op if it's already first in its list. */
export function indentBlock(doc: BlockDocument, id: BlockId): BlockDocument {
  const entry = findBlock(doc, id);
  if (!entry || entry.index === 0) return doc;
  const previousSibling = entry.siblings[entry.index - 1];
  if (!previousSibling) return doc;
  return moveBlock(doc, id, { type: "child-end", id: previousSibling.id });
}

/** Outdents a block: moves it to be the next sibling of its current parent. No-op at root. */
export function outdentBlock(doc: BlockDocument, id: BlockId): BlockDocument {
  const entry = findBlock(doc, id);
  if (!entry || !entry.parent) return doc;
  return moveBlock(doc, id, { type: "after", id: entry.parent.id });
}

export function convertBlock(
  doc: BlockDocument,
  id: BlockId,
  type: string,
  props: Record<string, unknown>
): BlockDocument {
  return updateBlockData(doc, id, (block) => ({ ...block, type, props }));
}

/** Flattens the visible tree into an ordered list annotated with nesting depth, for rendering. */
export interface FlatBlock {
  block: Block;
  depth: number;
  parentId: BlockId | null;
}

export function flatten(doc: BlockDocument): FlatBlock[] {
  const out: FlatBlock[] = [];
  const visit = (blocks: Block[], depth: number, parentId: BlockId | null) => {
    for (const block of blocks) {
      out.push({ block, depth, parentId });
      if (block.children && block.children.length > 0) {
        visit(block.children, depth + 1, block.id);
      }
    }
  };
  visit(doc.blocks, 0, null);
  return out;
}
