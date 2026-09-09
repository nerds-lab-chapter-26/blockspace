export type {
  BlockId,
  Block,
  BaseBlock,
  BlockDocument,
  InlineContent,
  InlineMark,
} from "./types.js";
export { DOCUMENT_SCHEMA_VERSION } from "./types.js";
export { createEmptyDocument, isBlockDocument } from "./document.js";

export type {
  BlockDefinition,
  AnyBlockDefinition,
  BlockRegistry,
  BlockRenderProps,
  BlockEditProps,
  SlashMenuMeta,
  SlashMenuEntry,
} from "./registry.js";
export { defineBlock, createBlockRegistry, buildSlashMenuEntries, isBlockEmpty } from "./registry.js";

export type { PersistenceAdapter, SaveStatus } from "./persistence/types.js";
export { createMemoryAdapter } from "./persistence/memoryAdapter.js";
export { createLocalStorageAdapter } from "./persistence/localStorageAdapter.js";
export type { SaveController } from "./persistence/autosave.js";
export { createSaveController } from "./persistence/autosave.js";

export { BlockEditor } from "./react/BlockEditor.js";
export type { BlockEditorProps, EditorHandle } from "./react/BlockEditor.js";
export { BlockRenderer } from "./react/BlockRenderer.js";
export type { BlockRendererProps } from "./react/BlockRenderer.js";

export {
  defaultBlocks,
  createDefaultRegistry,
  paragraphBlock,
  headingBlock,
  bulletedListItemBlock,
  numberedListItemBlock,
  todoBlock,
  quoteBlock,
  calloutBlock,
  codeBlock,
  dividerBlock,
  imageBlock,
} from "./blocks/index.js";
export type {
  HeadingProps,
  TodoProps,
  CalloutProps,
  CodeProps,
  ImageProps,
  NumberedListItemProps,
} from "./blocks/index.js";
