# Changelog

All notable changes to this project are documented here. Format loosely follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [0.1.1] - 2026-09-09

### Fixed

- A block with no text content (code, divider, image) sitting as the last block in a document had no way to add another block after it if it wasn't a code block being exited with Ctrl/Cmd+Enter. Clicking the empty space below the last block now always adds a new paragraph, matching the common editor convention of clicking below content to keep writing.
- Arrow-key navigation (Up/Down) was never wired up for the code block, meaning keyboard users could get stuck in it.

## [0.1.0] - 2026-09-09

### Added

- Core `BlockDocument` and `Block` types (schema version 1), `createEmptyDocument` and `isBlockDocument`.
- Block registry: `defineBlock`, `createBlockRegistry`, `createDefaultRegistry` with all 10 V1 block types (paragraph, heading, bulleted/numbered list item, to-do, quote, callout, code, divider, image).
- `BlockEditor`: a from-scratch contentEditable-based block editor with typing, Enter/Backspace/Tab keyboard behavior, undo/redo, a slash-command menu, inline formatting (bold/italic/underline/strikethrough/code/link) via a selection toolbar, and drag-to-reorder.
- `BlockRenderer`: standalone read-only renderer that mounts no editor state.
- Persistence: `PersistenceAdapter` contract, `createMemoryAdapter`, `createLocalStorageAdapter`, and a debounced autosave controller with `idle`/`saving`/`saved`/`error` status.
- A local Vite playground app (`/playground`) for manual testing.
