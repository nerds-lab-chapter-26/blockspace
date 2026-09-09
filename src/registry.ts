import type { ComponentType, ReactNode } from "react";
import type { BlockId, InlineContent } from "./types.js";

export interface BlockRenderProps<
  TProps extends Record<string, unknown> = Record<string, unknown>
> {
  id: BlockId;
  props: TProps;
  content?: InlineContent[];
  children?: ReactNode;
}

export interface BlockEditProps<
  TProps extends Record<string, unknown> = Record<string, unknown>
> extends BlockRenderProps<TProps> {
  onChangeProps: (patch: Partial<TProps>) => void;
  onChangeContent: (content: InlineContent[]) => void;
  onEnter: (caretOffset: number) => void;
  onBackspaceAtStart: () => void;
  onIndent: () => void;
  onOutdent: () => void;
  onArrowUpAtStart: () => void;
  onArrowDownAtEnd: () => void;
  onSelectionChange?: (range: Range | null) => void;
  onPaste?: (caretOffset: number, lines: string[]) => void;
  autoFocus: boolean;
  placeholder?: string;
  contentRef: (el: HTMLElement | null) => void;
}

export interface SlashMenuMeta {
  label: string;
  keywords?: string[];
  icon?: string;
  /** Overrides defaultProps for this specific menu entry (e.g. heading level 1 vs 2 vs 3). */
  props?: Record<string, unknown>;
}

export interface BlockDefinition<
  TType extends string = string,
  TProps extends Record<string, unknown> = Record<string, unknown>
> {
  type: TType;
  defaultProps: TProps;
  /** Whether this block carries rich-text `content`. Defaults to true. Set false for blocks like divider or image. */
  hasContent?: boolean;
  /** What pressing Enter at the end of this block creates next. Defaults to "paragraph"; list-like blocks typically use their own type. */
  continuationType?: string;
  /** Returns whether the block should be treated as empty for Backspace/merge purposes. Defaults to checking `content` text length. */
  isEmpty?: (props: TProps, content: InlineContent[] | undefined) => boolean;
  /** Custom Markdown serialization for `documentToMarkdown`. Without this, unknown block types fall back to plain text (or an HTML comment placeholder if they have no text content). */
  toMarkdown?: (props: TProps, content: InlineContent[] | undefined) => string;
  slashMenu?: SlashMenuMeta;
  /** Use when one block type should offer several slash-menu entries with different default props (e.g. Heading 1/2/3). */
  slashMenuItems?: SlashMenuMeta[];
  render: ComponentType<BlockRenderProps<TProps>>;
  edit: ComponentType<BlockEditProps<TProps>>;
}

export function defineBlock<
  TType extends string,
  TProps extends Record<string, unknown>
>(def: BlockDefinition<TType, TProps>): BlockDefinition<TType, TProps> {
  if (!def.type || typeof def.type !== "string") {
    throw new Error("defineBlock: `type` must be a non-empty string.");
  }
  return def;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyBlockDefinition = BlockDefinition<string, any>;

export interface BlockRegistry {
  register(def: AnyBlockDefinition): void;
  get(type: string): AnyBlockDefinition | undefined;
  has(type: string): boolean;
  list(): AnyBlockDefinition[];
}

export function createBlockRegistry(defs: AnyBlockDefinition[] = []): BlockRegistry {
  const map = new Map<string, AnyBlockDefinition>();

  const register = (def: AnyBlockDefinition) => {
    if (map.has(def.type)) {
      throw new Error(
        `createBlockRegistry: a block of type "${def.type}" is already registered. Block types must be unique.`
      );
    }
    map.set(def.type, def);
  };

  defs.forEach(register);

  return {
    register,
    get: (type) => map.get(type),
    has: (type) => map.has(type),
    list: () => Array.from(map.values()),
  };
}

export interface SlashMenuEntry {
  type: string;
  label: string;
  keywords: string[];
  icon?: string;
  props: Record<string, unknown>;
}

export function buildSlashMenuEntries(registry: BlockRegistry): SlashMenuEntry[] {
  const entries: SlashMenuEntry[] = [];
  for (const def of registry.list()) {
    if (def.slashMenuItems && def.slashMenuItems.length > 0) {
      for (const item of def.slashMenuItems) {
        entries.push({
          type: def.type,
          label: item.label,
          keywords: item.keywords ?? [],
          icon: item.icon,
          props: { ...def.defaultProps, ...item.props },
        });
      }
    } else if (def.slashMenu) {
      entries.push({
        type: def.type,
        label: def.slashMenu.label,
        keywords: def.slashMenu.keywords ?? [],
        icon: def.slashMenu.icon,
        props: { ...def.defaultProps },
      });
    }
  }
  return entries;
}

export function isBlockEmpty(
  def: AnyBlockDefinition | undefined,
  props: Record<string, unknown>,
  content: InlineContent[] | undefined
): boolean {
  if (def?.isEmpty) return def.isEmpty(props, content);
  if (def?.hasContent === false) return false;
  return !content || content.length === 0 || content.every((run) => run.text.length === 0);
}
