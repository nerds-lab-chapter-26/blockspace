import type { Block, BlockDocument, BlockId } from "../types.js";
import {
  type BlockLocation,
  convertBlock,
  indentBlock,
  insertBlock,
  moveBlock,
  outdentBlock,
  removeBlock,
  updateBlockData,
} from "./tree.js";

export type EditorAction =
  | { type: "insert"; block: Block; location: BlockLocation }
  | { type: "update"; id: BlockId; patch: Partial<Pick<Block, "props" | "content">> }
  | { type: "remove"; id: BlockId }
  | { type: "move"; id: BlockId; location: BlockLocation }
  | { type: "indent"; id: BlockId }
  | { type: "outdent"; id: BlockId }
  | { type: "convert"; id: BlockId; blockType: string; props: Record<string, unknown> }
  | { type: "set"; document: BlockDocument }
  | { type: "undo" }
  | { type: "redo" };

export interface EditorState {
  document: BlockDocument;
  past: BlockDocument[];
  future: BlockDocument[];
  /** Tracks the last mutating action so consecutive keystrokes in the same block coalesce into one undo step. */
  lastAction: { type: string; id?: BlockId } | null;
}

const HISTORY_LIMIT = 100;

function pushHistory(past: BlockDocument[], doc: BlockDocument): BlockDocument[] {
  const next = [...past, doc];
  return next.length > HISTORY_LIMIT ? next.slice(next.length - HISTORY_LIMIT) : next;
}

function applyAction(doc: BlockDocument, action: EditorAction): BlockDocument {
  switch (action.type) {
    case "insert":
      return insertBlock(doc, action.block, action.location);
    case "update":
      return updateBlockData(doc, action.id, (b) => ({ ...b, ...action.patch }));
    case "remove":
      return removeBlock(doc, action.id).doc;
    case "move":
      return moveBlock(doc, action.id, action.location);
    case "indent":
      return indentBlock(doc, action.id);
    case "outdent":
      return outdentBlock(doc, action.id);
    case "convert":
      return convertBlock(doc, action.id, action.blockType, action.props);
    default:
      return doc;
  }
}

export function createInitialEditorState(document: BlockDocument): EditorState {
  return { document, past: [], future: [], lastAction: null };
}

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  if (action.type === "undo") {
    if (state.past.length === 0) return state;
    const previous = state.past[state.past.length - 1]!;
    return {
      document: previous,
      past: state.past.slice(0, -1),
      future: pushHistory(state.future, state.document),
      lastAction: null,
    };
  }

  if (action.type === "redo") {
    if (state.future.length === 0) return state;
    const next = state.future[state.future.length - 1]!;
    return {
      document: next,
      past: pushHistory(state.past, state.document),
      future: state.future.slice(0, -1),
      lastAction: null,
    };
  }

  if (action.type === "set") {
    return { document: action.document, past: [], future: [], lastAction: null };
  }

  const coalesce =
    action.type === "update" &&
    state.lastAction?.type === "update" &&
    state.lastAction.id === action.id;

  const document = applyAction(state.document, action);
  if (document === state.document) return state;

  return {
    document,
    past: coalesce ? state.past : pushHistory(state.past, state.document),
    future: [],
    lastAction: { type: action.type, id: "id" in action ? action.id : undefined },
  };
}
