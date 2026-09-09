import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent } from "react";
import type { Block, BlockDocument, BlockId, InlineContent } from "../types.js";
import { createEmptyDocument } from "../document.js";
import {
  buildSlashMenuEntries,
  type AnyBlockDefinition,
  type BlockRegistry,
  type SlashMenuEntry,
} from "../registry.js";
import { createInitialEditorState, editorReducer } from "../state/reducer.js";
import { findBlock, flatten, type BlockLocation } from "../state/tree.js";
import { domToInline, inlineToText, mergeInline, splitInline } from "../inline/serialize.js";
import { setCaretOffset } from "../dom/caret.js";
import type { PersistenceAdapter, SaveStatus } from "../persistence/types.js";
import { createSaveController } from "../persistence/autosave.js";
import { SlashMenu } from "./SlashMenu.js";
import { FormatToolbar } from "./FormatToolbar.js";

function generateId(): BlockId {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `blk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function createBlock(
  type: string,
  def: AnyBlockDefinition | undefined,
  props: Record<string, unknown> = {}
): Block {
  return {
    id: generateId(),
    type,
    props: { ...(def?.defaultProps ?? {}), ...props },
    content: def?.hasContent === false ? undefined : [],
    children: [],
  };
}

export interface EditorHandle {
  getDocument(): BlockDocument;
  insertBlock(input: { type: string; props?: Record<string, unknown>; afterId?: BlockId }): BlockId;
  updateBlock(id: BlockId, patch: { props?: Record<string, unknown>; content?: InlineContent[] }): void;
  removeBlock(id: BlockId): void;
  moveBlock(id: BlockId, location: BlockLocation): void;
  convertBlock(id: BlockId, type: string, props?: Record<string, unknown>): void;
  focusBlock(id: BlockId, position?: "start" | "end"): void;
  undo(): void;
  redo(): void;
}

export interface BlockEditorProps {
  /** Required when using the `persistence` adapter, so it knows which document to load/save. */
  documentId?: string;
  /** Controlled value. When provided, the editor mirrors it and calls `onChange` on every edit. */
  value?: BlockDocument;
  /** Initial value for uncontrolled usage. Ignored once `persistence` finishes loading, if provided. */
  defaultValue?: BlockDocument;
  onChange?: (document: BlockDocument) => void;
  registry: BlockRegistry;
  persistence?: PersistenceAdapter;
  autosaveDebounceMs?: number;
  onSaveStatusChange?: (status: SaveStatus) => void;
  placeholder?: string;
  className?: string;
  style?: CSSProperties;
}

export const BlockEditor = forwardRef<EditorHandle, BlockEditorProps>(function BlockEditor(
  {
    documentId,
    value,
    defaultValue,
    onChange,
    registry,
    persistence,
    autosaveDebounceMs = 400,
    onSaveStatusChange,
    placeholder,
    className,
    style,
  },
  ref
) {
  const isControlled = value !== undefined;
  const [state, dispatch] = useReducer(
    editorReducer,
    value ?? defaultValue ?? createEmptyDocument(),
    createInitialEditorState
  );

  const contentRefs = useRef(new Map<BlockId, HTMLElement>());
  const pendingFocus = useRef<{ id: BlockId; position: "start" | "end" | number } | null>(null);
  const skipNextSave = useRef(true);
  const prevControlledValue = useRef(value);
  const saveController = useRef<ReturnType<typeof createSaveController> | null>(null);

  const [slashMenu, setSlashMenu] = useState<{ blockId: BlockId; query: string } | null>(null);
  const [slashActiveIndex, setSlashActiveIndex] = useState(0);
  const [activeSelection, setActiveSelection] = useState<{ blockId: BlockId; range: Range } | null>(null);
  const [dropIndicator, setDropIndicator] = useState<{ id: BlockId; position: "before" | "after" } | null>(null);
  const draggingId = useRef<BlockId | null>(null);

  // A document with zero blocks has nothing to click into. Always keep at least one empty
  // paragraph so the editor stays usable; this also self-heals if `value` is ever passed empty.
  useEffect(() => {
    if (state.document.blocks.length === 0) {
      const def = registry.get("paragraph");
      dispatch({ type: "insert", block: createBlock("paragraph", def), location: { type: "root-end" } });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.document.blocks.length]);

  useEffect(() => {
    if (!persistence || !documentId) return;
    const controller = createSaveController(persistence, documentId, autosaveDebounceMs);
    saveController.current = controller;
    const unsubscribe = onSaveStatusChange ? controller.subscribe(onSaveStatusChange) : undefined;
    return () => {
      controller.dispose();
      unsubscribe?.();
      saveController.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persistence, documentId, autosaveDebounceMs]);

  useEffect(() => {
    if (isControlled || !persistence || !documentId) return;
    let cancelled = false;
    void persistence.load(documentId).then((loaded) => {
      if (!cancelled && loaded) {
        skipNextSave.current = true;
        dispatch({ type: "set", document: loaded });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [documentId, isControlled, persistence]);

  useEffect(() => {
    if (isControlled && value !== prevControlledValue.current) {
      prevControlledValue.current = value;
      skipNextSave.current = true;
      dispatch({ type: "set", document: value! });
    }
  }, [value, isControlled]);

  const isFirstChangeEffect = useRef(true);
  useEffect(() => {
    if (isFirstChangeEffect.current) {
      isFirstChangeEffect.current = false;
      return;
    }
    onChange?.(state.document);
    if (skipNextSave.current) {
      skipNextSave.current = false;
    } else {
      saveController.current?.scheduleSave(state.document);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.document]);

  useEffect(() => {
    const pending = pendingFocus.current;
    if (!pending) return;
    const el = contentRefs.current.get(pending.id);
    if (!el) return;
    pendingFocus.current = null;
    el.focus();
    if (el.tagName !== "INPUT" && el.tagName !== "TEXTAREA") {
      const text = el.textContent ?? "";
      const offset = pending.position === "start" ? 0 : pending.position === "end" ? text.length : pending.position;
      setCaretOffset(el, offset);
    }
  });

  const scheduleFocus = (id: BlockId, position: "start" | "end" | number = "start") => {
    pendingFocus.current = { id, position };
  };

  const focusNow = (id: BlockId, position: "start" | "end" | number = "start") => {
    const el = contentRefs.current.get(id);
    if (!el) {
      scheduleFocus(id, position);
      return;
    }
    el.focus();
    if (el.tagName !== "INPUT" && el.tagName !== "TEXTAREA") {
      const text = el.textContent ?? "";
      const offset = position === "start" ? 0 : position === "end" ? text.length : position;
      setCaretOffset(el, offset);
    }
  };

  const getBlockProps = (id: BlockId): Record<string, unknown> =>
    findBlock(state.document, id)?.block.props ?? {};

  const handleChangeContent = (id: BlockId, content: InlineContent[]) => {
    dispatch({ type: "update", id, patch: { content } });
    const text = inlineToText(content);
    if (text.startsWith("/")) {
      setSlashMenu({ blockId: id, query: text.slice(1) });
      setSlashActiveIndex(0);
    } else if (slashMenu?.blockId === id) {
      setSlashMenu(null);
    }
  };

  const handleChangeProps = (id: BlockId, patch: Record<string, unknown>) => {
    dispatch({ type: "update", id, patch: { props: { ...getBlockProps(id), ...patch } } });
  };

  const handleEnter = (id: BlockId, caretOffset: number) => {
    const entry = findBlock(state.document, id);
    if (!entry) return;
    const def = registry.get(entry.block.type);
    const nextType = def?.continuationType ?? "paragraph";
    const nextDef = registry.get(nextType);
    const newBlock = createBlock(nextType, nextDef);

    if (def?.hasContent === false) {
      dispatch({ type: "insert", block: newBlock, location: { type: "after", id } });
      scheduleFocus(newBlock.id, "start");
      return;
    }

    const [before, after] = splitInline(entry.block.content ?? [], caretOffset);
    newBlock.content = after;
    dispatch({ type: "update", id, patch: { content: before } });
    dispatch({ type: "insert", block: newBlock, location: { type: "after", id } });
    scheduleFocus(newBlock.id, "start");
  };

  const handleBackspaceAtStart = (id: BlockId) => {
    const flat = flatten(state.document);
    const idx = flat.findIndex((f) => f.block.id === id);
    if (idx <= 0) return;
    const current = flat[idx]!.block;
    const previous = flat[idx - 1]!.block;
    const prevDef = registry.get(previous.type);
    if (prevDef?.hasContent === false) return;

    const prevContent = previous.content ?? [];
    const mergedOffset = inlineToText(prevContent).length;
    dispatch({
      type: "update",
      id: previous.id,
      patch: { content: mergeInline(prevContent, current.content ?? []) },
    });
    dispatch({ type: "remove", id: current.id });
    scheduleFocus(previous.id, mergedOffset);
  };

  const handleArrowUp = (id: BlockId) => {
    const flat = flatten(state.document);
    const idx = flat.findIndex((f) => f.block.id === id);
    if (idx > 0) focusNow(flat[idx - 1]!.block.id, "end");
  };

  const handleArrowDown = (id: BlockId) => {
    const flat = flatten(state.document);
    const idx = flat.findIndex((f) => f.block.id === id);
    if (idx !== -1 && idx < flat.length - 1) focusNow(flat[idx + 1]!.block.id, "start");
  };

  const slashEntries = useMemo(() => buildSlashMenuEntries(registry), [registry]);
  const filteredSlashEntries = useMemo<SlashMenuEntry[]>(() => {
    if (!slashMenu) return [];
    const q = slashMenu.query.trim().toLowerCase();
    if (!q) return slashEntries;
    return slashEntries.filter(
      (e) => e.label.toLowerCase().includes(q) || e.keywords.some((k) => k.includes(q))
    );
  }, [slashMenu, slashEntries]);

  const applySlashSelection = (entry: SlashMenuEntry) => {
    if (!slashMenu) return;
    const id = slashMenu.blockId;
    const def = registry.get(entry.type);
    dispatch({ type: "convert", id, blockType: entry.type, props: entry.props });
    dispatch({ type: "update", id, patch: { content: def?.hasContent === false ? undefined : [] } });
    setSlashMenu(null);
    scheduleFocus(id, "start");
  };

  const handleFormat = (command: string, value2?: string) => {
    if (!activeSelection) return;
    const el = contentRefs.current.get(activeSelection.blockId);
    if (!el) return;
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(activeSelection.range);
    document.execCommand(command, false, value2);
    dispatch({ type: "update", id: activeSelection.blockId, patch: { content: domToInline(el) } });
    setActiveSelection(null);
  };

  useImperativeHandle(
    ref,
    (): EditorHandle => ({
      getDocument: () => state.document,
      insertBlock: ({ type, props, afterId }) => {
        const def = registry.get(type);
        const block = createBlock(type, def, props);
        const location: BlockLocation = afterId ? { type: "after", id: afterId } : { type: "root-end" };
        dispatch({ type: "insert", block, location });
        return block.id;
      },
      updateBlock: (id, patch) => {
        const merged: Partial<Pick<Block, "props" | "content">> = {};
        if (patch.props) merged.props = { ...getBlockProps(id), ...patch.props };
        if (patch.content) merged.content = patch.content;
        dispatch({ type: "update", id, patch: merged });
      },
      removeBlock: (id) => dispatch({ type: "remove", id }),
      moveBlock: (id, location) => dispatch({ type: "move", id, location }),
      convertBlock: (id, type, props) => {
        const def = registry.get(type);
        dispatch({ type: "convert", id, blockType: type, props: { ...(def?.defaultProps ?? {}), ...props } });
      },
      focusBlock: (id, position = "start") => focusNow(id, position),
      undo: () => dispatch({ type: "undo" }),
      redo: () => dispatch({ type: "redo" }),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.document, registry]
  );

  const handleEditorKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (slashMenu) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSlashActiveIndex((i) => Math.min(i + 1, Math.max(filteredSlashEntries.length - 1, 0)));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSlashActiveIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const entry = filteredSlashEntries[slashActiveIndex];
        if (entry) applySlashSelection(entry);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setSlashMenu(null);
        return;
      }
    }

    const isMeta = e.metaKey || e.ctrlKey;
    if (isMeta && e.key.toLowerCase() === "z" && !e.shiftKey) {
      e.preventDefault();
      dispatch({ type: "undo" });
    } else if (isMeta && ((e.key.toLowerCase() === "z" && e.shiftKey) || e.key.toLowerCase() === "y")) {
      e.preventDefault();
      dispatch({ type: "redo" });
    }
  };

  const handleDrop = (targetId: BlockId, position: "before" | "after") => {
    const id = draggingId.current;
    draggingId.current = null;
    setDropIndicator(null);
    if (!id || id === targetId) return;
    dispatch({ type: "move", id, location: { type: position, id: targetId } });
  };

  return (
    <div
      className={className}
      style={{ position: "relative", ...style }}
      onKeyDownCapture={handleEditorKeyDown}
      data-blockspace-editor=""
    >
      {renderEditableBlocks(state.document.blocks, {
        registry,
        contentRefs: contentRefs.current,
        onChangeContent: handleChangeContent,
        onChangeProps: handleChangeProps,
        onEnter: handleEnter,
        onBackspaceAtStart: handleBackspaceAtStart,
        onIndent: (id) => dispatch({ type: "indent", id }),
        onOutdent: (id) => dispatch({ type: "outdent", id }),
        onArrowUp: handleArrowUp,
        onArrowDown: handleArrowDown,
        autoFocusId: null,
        onSelectionChange: (blockId, range) =>
          setActiveSelection(range ? { blockId, range } : null),
        placeholder,
        draggingId,
        dropIndicator,
        setDropIndicator,
        onDrop: handleDrop,
      })}

      {/* Clicking below the last block adds a new paragraph -- the only way to get past a
          trailing non-text block (code/divider/image) where Enter doesn't create a sibling. */}
      <div
        data-blockspace-trailing-area=""
        style={{ minHeight: 80, cursor: "text" }}
        onClick={() => {
          const blocks = state.document.blocks;
          const last = blocks[blocks.length - 1];
          if (last && last.type === "paragraph" && inlineToText(last.content ?? []).length === 0) {
            focusNow(last.id, "start");
            return;
          }
          const def = registry.get("paragraph");
          const block = createBlock("paragraph", def);
          dispatch({ type: "insert", block, location: { type: "root-end" } });
          scheduleFocus(block.id, "start");
        }}
      />

      {slashMenu &&
        (() => {
          const el = contentRefs.current.get(slashMenu.blockId);
          const rect = el?.getBoundingClientRect();
          return rect ? (
            <div style={{ position: "fixed", top: rect.bottom + 4, left: rect.left, zIndex: 20 }}>
              <SlashMenu
                entries={filteredSlashEntries}
                activeIndex={slashActiveIndex}
                onHover={setSlashActiveIndex}
                onSelect={applySlashSelection}
              />
            </div>
          ) : null;
        })()}

      {activeSelection &&
        (() => {
          const rect = activeSelection.range.getBoundingClientRect();
          if (rect.width === 0 && rect.height === 0) return null;
          return (
            <FormatToolbar top={rect.top} left={rect.left} onFormat={handleFormat} />
          );
        })()}
    </div>
  );
});

interface RenderContext {
  registry: BlockRegistry;
  contentRefs: Map<BlockId, HTMLElement>;
  onChangeContent: (id: BlockId, content: InlineContent[]) => void;
  onChangeProps: (id: BlockId, patch: Record<string, unknown>) => void;
  onEnter: (id: BlockId, caretOffset: number) => void;
  onBackspaceAtStart: (id: BlockId) => void;
  onIndent: (id: BlockId) => void;
  onOutdent: (id: BlockId) => void;
  onArrowUp: (id: BlockId) => void;
  onArrowDown: (id: BlockId) => void;
  autoFocusId: BlockId | null;
  onSelectionChange: (id: BlockId, range: Range | null) => void;
  placeholder?: string;
  draggingId: { current: BlockId | null };
  dropIndicator: { id: BlockId; position: "before" | "after" } | null;
  setDropIndicator: (v: { id: BlockId; position: "before" | "after" } | null) => void;
  onDrop: (targetId: BlockId, position: "before" | "after") => void;
}

function renderEditableBlocks(blocks: Block[], ctx: RenderContext) {
  let numberedCounter = 0;

  return blocks.map((block) => {
    const def = ctx.registry.get(block.type);
    numberedCounter = block.type === "numberedListItem" ? numberedCounter + 1 : 0;

    if (!def) {
      return (
        <div key={block.id} style={{ color: "#b91c1c", fontSize: "0.85em" }}>
          Unknown block type "{block.type}". Is it registered?
        </div>
      );
    }

    const Edit = def.edit;
    const props =
      block.type === "numberedListItem" ? { ...block.props, listNumber: numberedCounter } : block.props;

    const showIndicator = ctx.dropIndicator?.id === block.id;

    const children =
      block.children && block.children.length > 0 ? (
        <div style={{ paddingLeft: 22 }}>{renderEditableBlocks(block.children, ctx)}</div>
      ) : null;

    return (
      <div
        key={block.id}
        data-block-id={block.id}
        data-block-type={block.type}
        style={{ position: "relative", padding: "2px 0" }}
        onDragOver={(e) => {
          if (!ctx.draggingId.current) return;
          e.preventDefault();
          const rect = e.currentTarget.getBoundingClientRect();
          const position = e.clientY - rect.top < rect.height / 2 ? "before" : "after";
          ctx.setDropIndicator({ id: block.id, position });
        }}
        onDrop={(e) => {
          e.preventDefault();
          const position = ctx.dropIndicator?.position ?? "after";
          ctx.onDrop(block.id, position);
        }}
      >
        {showIndicator && ctx.dropIndicator?.position === "before" && <DropLine />}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 4 }}>
          <span
            draggable
            role="button"
            aria-label={`Drag to reorder "${block.type}" block`}
            onDragStart={() => {
              ctx.draggingId.current = block.id;
            }}
            onDragEnd={() => {
              ctx.draggingId.current = null;
              ctx.setDropIndicator(null);
            }}
            style={{
              cursor: "grab",
              userSelect: "none",
              color: "rgba(55,53,47,0.35)",
              padding: "2px 4px",
              marginTop: 2,
              fontSize: "0.9em",
              lineHeight: 1,
            }}
            title="Drag to move"
          >
            ⠿
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Edit
              id={block.id}
              props={props}
              content={block.content}
              autoFocus={false}
              placeholder={block.type === "paragraph" ? ctx.placeholder : undefined}
              contentRef={(el) => {
                if (el) ctx.contentRefs.set(block.id, el);
                else ctx.contentRefs.delete(block.id);
              }}
              onChangeContent={(content) => ctx.onChangeContent(block.id, content)}
              onChangeProps={(patch) => ctx.onChangeProps(block.id, patch as Record<string, unknown>)}
              onEnter={(offset) => ctx.onEnter(block.id, offset)}
              onBackspaceAtStart={() => ctx.onBackspaceAtStart(block.id)}
              onIndent={() => ctx.onIndent(block.id)}
              onOutdent={() => ctx.onOutdent(block.id)}
              onArrowUpAtStart={() => ctx.onArrowUp(block.id)}
              onArrowDownAtEnd={() => ctx.onArrowDown(block.id)}
              onSelectionChange={(range) => ctx.onSelectionChange(block.id, range)}
            >
              {children}
            </Edit>
          </div>
        </div>
        {showIndicator && ctx.dropIndicator?.position === "after" && <DropLine />}
      </div>
    );
  });
}

function DropLine() {
  return <div style={{ height: 2, background: "#2383e2", borderRadius: 1, margin: "2px 0" }} />;
}
