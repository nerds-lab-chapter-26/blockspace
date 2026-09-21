---
name: space2space
description: Use when building, customizing, or debugging a block editor built with the space2space npm package (a from-scratch, Notion-style block editor for React) -- covers defineBlock, registry setup, persistence adapters, Markdown export, and known contentEditable/IME gotchas that have already caused real bugs in this library.
---

# space2space block editor

space2space is a Notion-style block editor for React, built from scratch -- no ProseMirror, no Tiptap, no Lexical underneath. The document model is a plain JSON tree of blocks; the editor is a hand-built contentEditable engine. This means it does **not** inherit ProseMirror's years of caret/IME/selection hardening -- treat any contentEditable-related change here with real caution, and prefer adding a test over trusting manual verification alone.

## Core API

- `BlockEditor` -- the editable component. Required prop: `registry`. Common props: `documentId`, `persistence`, `value`/`onChange` (controlled) or `defaultValue` (uncontrolled), `placeholder`, `funMode`. Imperative handle via `ref`: `insertBlock`, `updateBlock`, `removeBlock`, `moveBlock`, `convertBlock`, `focusBlock`, `undo`, `redo`, `getDocument`.
- `BlockRenderer` -- read-only, mounts zero editor state. Props: `document`, `registry`.
- `createDefaultRegistry()` -- registry with the 10 built-in blocks (paragraph, heading, bulletedListItem, numberedListItem, todo, quote, callout, code, divider, image).
- `defineBlock(definition)` / `createBlockRegistry(defs)` -- register custom block types.
- `createMemoryAdapter()` / `createLocalStorageAdapter(options?)` -- `PersistenceAdapter` (`load`/`save`/`delete`) implementations.
- `documentToMarkdown(doc, registry?)` -- best-effort Markdown export (not lossless).
- `markdownToDocument(markdown)` -- best-effort Markdown import; returns a `BlockDocument` with fresh ids. Use it as `defaultValue` or `value` on `BlockEditor`. Unsupported syntax degrades to paragraphs instead of throwing, and unsafe URL schemes are stripped.

## Data model

`BlockDocument = { version: 1, blocks: Block[] }`. `Block = { id, type, props, content?: InlineContent[], children?: Block[] }`. `InlineContent` is `{ type: "text", text, marks: InlineMark[] }`; marks are `bold | italic | underline | strikethrough | code | link`.

## Adding a new block type

Use `defineBlock`. If the block carries rich text, prefer the `createTextBlock` factory in `src/blocks/textBlock.tsx` (paragraph/heading/quote/todo/list items/callout all use it) instead of writing `render`/`edit` from scratch -- it wires up `EditableRichText` correctly, including all the gotchas below. Only write a bespoke `render`/`edit` pair for blocks with no rich text (code/divider/image are the existing examples) or genuinely custom interaction.

Checklist for a new block:
- [ ] `type` is unique in the registry.
- [ ] `slashMenu` or `slashMenuItems` is set, or the block is impossible to insert via the UI. (This was shipped as a real bug twice -- paragraph and divider were both missing it in an early version.)
- [ ] `hasContent: false` if the block has no `InlineContent` (it uses `props` fields instead, like code's `props.code`).
- [ ] `continuationType` set if pressing Enter at the end should create a sibling of the *same* type (list items, todo) rather than a new paragraph (the default).
- [ ] `isEmpty` overridden if emptiness isn't "no text content" (code checks `props.code.trim()`, divider is never empty).

## Known gotchas -- do not reintroduce these

1. **Never let React re-render a contentEditable element's children/innerHTML declaratively from `content` state on every render.** Reassigning `innerHTML` -- even to text that's already there -- resets the caret to position 0. If you do this on every keystroke, typed characters insert in reverse order (a real shipped bug: typing "abc" produced "cba"). The fix, already implemented in `src/react/EditableRichText.tsx`, is to sync content in a `useLayoutEffect` and skip it entirely when the new content reference came from this component's own `onChange` (the DOM already has it natively from the browser). If you touch this file, add a test that types multiple characters through *separate* input events -- a test that sets the whole final string in one `fireEvent.input` call will not catch this class of bug.
2. **IME composition** (Chinese/Japanese/Korean, some Urdu/Arabic layouts) fires intermediate `input` events while composing. Do not sync those to React state -- it can interrupt the OS's composition UI. Wait for `compositionend` (see `isComposing` ref in `EditableRichText.tsx`).
3. **Paste is plain-text only, intentionally.** Multi-line pastes split into separate paragraph blocks; rich HTML from clipboard (Word, Google Docs) is not preserved. Don't "fix" this into rendering pasted HTML directly without discussing scope -- it was a deliberate v1 decision for safety and predictability.
4. **A trailing non-text block (code/divider/image) as the last block in a document has no `Enter`-splits-a-block escape hatch**, since Enter in a code block just inserts a newline. `BlockEditor` renders a click-below-content trailing area as the fallback -- don't remove it without providing another way to add a block after such a block.
5. **Markdown import must keep URLs safe, and must stay linear-time.** `BlockRenderer` emits link hrefs and image srcs verbatim, so `sanitizeUrl` in `src/markdown/inline.ts` (http/https/mailto/tel/relative only; raster `data:` for images) is the only thing between untrusted Markdown and a `javascript:` link. Never bypass it, and if you add another importer, do the same. Emphasis resolution there follows the CommonMark delimiter-stack algorithm and applies marks in one sweep at the end; an earlier version stamped marks onto every node inside each pair and took ~111 seconds on 3,000 nested `*a ...a*` pairs (now ~60 ms even at 20,000). The `pathological input` tests guard this -- keep them passing.
6. **Test DOM cleanup**: `@testing-library/react`'s auto-cleanup needs a global `afterEach`, which this project's Vitest config doesn't provide (no `globals: true`). `src/test/setup.ts` calls `cleanup()` explicitly -- if a new test file bypasses that setup file, tests will leak DOM across cases in the same file.

## Common tasks

- **New persistence backend** (e.g. a REST API): implement `PersistenceAdapter` (`load(id)`, `save(id, doc)`, optional `delete(id)`) -- no need to touch the editor itself.
- **Markdown export for a custom block**: add `toMarkdown(props, content)` to its `defineBlock` call, or it falls back to plain text (or an HTML comment placeholder if it has no text content).
- **Changing Markdown import**: block-level parsing is `src/markdown/fromMarkdown.ts`, inline parsing is `src/markdown/inline.ts`. Add a case to `fromMarkdown.test.ts`, and keep the round-trip test (`documentToMarkdown` then `markdownToDocument` reproduces every built-in block) green. The block model has no soft line break, so a paragraph's line breaks collapse to spaces by design.
- **Verifying a fix to typing/caret behavior**: write a test that fires `input` events one character at a time via separate `fireEvent.input` calls (see `typeCharAtCaret` in `src/react/BlockEditor.test.tsx`), not one that sets the final string in a single call -- the latter will not exercise the render cycle between keystrokes where caret bugs live.

## Where things live

- `src/registry.ts` -- `defineBlock`, `BlockRegistry`, the `BlockEditProps`/`BlockRenderProps` contracts.
- `src/blocks/` -- the 10 built-in block definitions and the `createTextBlock` factory.
- `src/react/EditableRichText.tsx` -- the contentEditable engine; read the gotchas above before touching it.
- `src/react/BlockEditor.tsx` -- orchestrates keyboard behavior, slash menu, undo/redo, multi-block selection, paste.
- `src/state/` -- the pure tree/reducer logic, framework-agnostic and heavily unit tested.
- `src/persistence/` -- adapters and the autosave controller.
- `src/markdown/toMarkdown.ts` -- Markdown export.
- `src/markdown/fromMarkdown.ts`, `src/markdown/inline.ts` -- Markdown import (block parser and inline/emphasis parser).
