# Changelog

All notable changes to this project are documented here. Format loosely follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [0.4.1] - 2026-09-09

### Added

- `llms.txt` -- a concise, tool-agnostic API reference (following the [llms.txt](https://llmstxt.org/) convention) shipped with the package, for grounding any LLM-based coding tool instead of letting it guess at the API.
- `skill/SKILL.md` -- a Claude Code Skill covering the API plus the non-obvious contentEditable/IME gotchas this project has already hit, so an agent working on space2space-related code doesn't reintroduce them. Copy it to `.claude/skills/space2space/SKILL.md` in a consuming project.

No code changes.

## [0.4.0] - 2026-09-09

### Added

- **`documentToMarkdown(doc, registry?)`.** A best-effort, one-way export of a `BlockDocument` to a Markdown string -- headings, lists, todos (`- [x]`), quotes, callouts, fenced code blocks, dividers, and images with captions. The JSON document stays the source of truth (Markdown can't represent everything a block can hold -- a callout's color or an image's alt text has no standard syntax and is dropped on export); this is for backup, static site generators, or interop with Markdown-based tools. Custom block types can define their own `toMarkdown` in `defineBlock`; without one, unknown types fall back to their plain text content.

## [0.3.0] - 2026-09-09

### Added

- **`funMode` (opt-in, off by default).** A small console message with a joke prints once per page load regardless of this setting, since it has zero UI impact. When `funMode` is explicitly turned on, a dismissible corner toast with a joke appears every `funModeIntervalMs` (default 30 minutes), and an empty block's placeholder occasionally turns playful. Off by default and never enabled implicitly, in keeping with this library's own principle that the developer controls the UI -- a library has no business surprising a consuming app's users unless asked to.

## [0.2.0] - 2026-09-09

### Added

- **Paste handling.** Pasting always inserts plain text (rich formatting/structure from clipboard HTML is out of scope for now) split on newlines: single-line pastes merge into the current block at the caret, multi-line pastes split into separate paragraph blocks, preserving whatever came before and after the caret in the original block.
- **IME composition support.** Typing via an IME (Chinese/Japanese/Korean, some Urdu/Arabic layouts) previously synced every intermediate composition update to state, risking interference with the OS's composition UI. Input is now ignored while composing and flushed once, on `compositionend`.
- **Multi-block selection.** Click a block's drag handle to select it, shift-click another handle to select the range between them, then Backspace/Delete removes every selected block at once. Escape clears the selection, and focusing any block's text also clears it. This is mouse-driven for now -- keyboard-only range selection across blocks is not yet supported.

## [0.1.2] - 2026-09-09

### Fixed

- Typing appeared to insert characters backwards (e.g. typing "abc" produced "cba"). `EditableRichText` was resetting the contentEditable's `innerHTML` after every keystroke, which resets the browser's caret to the start of the element -- so each new character landed in front of everything already typed. Content is now synced to the DOM imperatively and only for changes that didn't originate from the user's own typing (undo/redo, loading a document); self-originated changes are left alone since the browser already applied them correctly.

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
