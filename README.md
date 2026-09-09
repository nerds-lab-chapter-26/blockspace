# space2space

[![npm version](https://img.shields.io/npm/v/space2space.svg)](https://www.npmjs.com/package/space2space)
[![npm downloads](https://img.shields.io/npm/dm/space2space.svg)](https://www.npmjs.com/package/space2space)
[![CI](https://github.com/nerds-lab-chapter-26/blockspace/actions/workflows/ci.yml/badge.svg)](https://github.com/nerds-lab-chapter-26/blockspace/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/npm/l/space2space.svg)](./LICENSE)

Open-source, backend-agnostic building blocks for Notion-style editing in React.

Most block editors either lock you into a hosted API, or hand you a raw rich-text engine and leave you to build block identity, persistence, and custom blocks yourself. space2space is the missing layer in between: a typed block schema, editing commands, and a persistence contract you can wire up to whatever backend you already use — your own database, a REST API, or nothing at all.

You own the data. You choose the backend. You control the UI.

**Free and local-first by default, flexible by design.** No API keys, no monthly fees, no usage-based billing, no cloud dependency -- install it and start writing with the built-in localStorage adapter, and your data never leaves the browser unless you decide it should. Nothing here is hardcoded:

- **Swap the backend anytime.** `PersistenceAdapter` is a 3-method contract (`load`/`save`/`delete`). Start with localStorage, move to Postgres, MongoDB, or your own REST API later by implementing those three methods -- the editor doesn't know or care which one you're using.
- **Add or remove blocks anytime.** Register your own block types with `defineBlock`, or build a registry with only the built-in blocks you actually want (`createBlockRegistry(defaultBlocks.filter(...))`) -- nothing is baked in.

## Status

Early but functional: a real block editor built from scratch (no ProseMirror/Lexical/Tiptap underneath), not just a schema. All 10 V1 block types work — paragraph, heading, bulleted/numbered lists, to-do, quote, callout, code, divider, image — with typing, Enter/Backspace/Tab keyboard behavior, a slash-command menu, inline formatting (bold/italic/underline/strikethrough/code/link), undo/redo, drag-to-reorder, and a standalone read-only renderer.

Markdown export is available (`documentToMarkdown`), one-way and best-effort. Not yet done, roughly in order of what's next: Markdown import, polished default styling/theming, HTML import/export, and database adapters beyond in-memory and localStorage (Postgres, Supabase, Mongo).

Track progress and design decisions in [PRD.md](./PRD.md).

## Try it locally

```bash
git clone https://github.com/nerds-lab-chapter-26/blockspace.git
cd blockspace
npm install
cd playground
npm install
npm run dev
```

Opens a live playground with the editor and the read-only renderer side by side, backed by localStorage so your content survives a reload.

## Install

```bash
npm install space2space
```

## Quick example

```tsx
import {
  BlockEditor,
  BlockRenderer,
  createDefaultRegistry,
  createLocalStorageAdapter,
} from "space2space";

const registry = createDefaultRegistry();
const adapter = createLocalStorageAdapter({ keyPrefix: "my-app:" });

export function Notes() {
  return (
    <BlockEditor
      documentId="my-notes"
      registry={registry}
      persistence={adapter}
      placeholder="Type '/' for commands"
    />
  );
}

export function PublicNotes({ document }) {
  return <BlockRenderer document={document} registry={registry} />;
}
```

`BlockEditor` also accepts `value`/`onChange` for fully controlled usage, and exposes an imperative handle (`insertBlock`, `updateBlock`, `removeBlock`, `moveBlock`, `convertBlock`, `focusBlock`, `undo`, `redo`) via `ref`. See PRD.md for the full API rationale and roadmap.

There's also a `funMode` prop, off by default, for anyone who wants a dismissible joke toast during long writing sessions (`<BlockEditor funMode funModeIntervalMs={30 * 60 * 1000} />`). It's opt-in on purpose -- a library shouldn't surprise a consuming app's users unless the app explicitly asks for it.

## Why another block editor library

A handful of open-source editors already exist. What's missing, consistently, is:

- a persistence layer that doesn't assume a specific database or hosted service;
- a small, stable contract for registering custom application blocks;
- a document format that renders the same whether you're editing or just displaying it.

space2space is being built to close that gap, not to replace Notion.

### vs. Tiptap and BlockNote, specifically

Tiptap isn't actually a block editor -- it's a headless rich-text framework built on ProseMirror, with no native concept of "blocks." That's exactly why [BlockNote](https://www.blocknotejs.org/) exists, as a layer on top of Tiptap that adds blocks. So the fair comparison is against BlockNote, not raw Tiptap.

| | BlockNote | space2space |
| --- | --- | --- |
| Editor engine | Tiptap + ProseMirror | None -- only React as a peer dependency |
| Persistence | You wire it up yourself | Built in: adapters + save-status out of the box |
| Read-only rendering | Still boots a full ProseMirror editor instance, just non-editable | Mounts zero editor machinery -- plain React walking JSON |
| Bundle weight | Heavier (Tiptap + ProseMirror + extensions) | ~65 KB total, no engine weight |
| Learning the internals | Requires understanding ProseMirror's NodeSpec/Schema/Transaction model | Plain arrays and functions, readable in an afternoon |
| License/upsell risk | Tiptap Pro gates some extensions (collaboration, etc.) behind a paid tier | Fully MIT, nothing paid underneath |

The honest counter-side matters more than the table: BlockNote and Tiptap have years of production hardening -- IME input, mobile browser quirks, tables, real collaborative editing, a mature ecosystem. space2space does not have that history yet. If you need to ship a serious product today, BlockNote is the safer choice.

The actual pitch here is narrower: you can read and own the entire editor, it doesn't drag in ProseMirror, and persistence plus read-only rendering are first-class instead of something you bolt on yourself. That's a real but specific niche, not a claim to be more capable than BlockNote.

## Using an AI coding assistant with space2space

Two files ship with this package to give coding agents accurate context instead of letting them guess at the API:

- **[`llms.txt`](./llms.txt)** -- a concise, tool-agnostic API reference (following the [llms.txt](https://llmstxt.org/) convention). Point any LLM-based tool at it, or paste it into a chat, for grounded answers instead of hallucinated API calls.
- **[`skill/SKILL.md`](./skill/SKILL.md)** -- a [Claude Code Skill](https://code.claude.com/docs/en/capabilities/skills). Copy it to `.claude/skills/space2space/SKILL.md` in a project that uses this library, and Claude Code will automatically load it when working on space2space-related code -- including the non-obvious gotchas (contentEditable caret handling, IME composition, why every block needs a slash-menu entry) that this project has already learned the hard way, so an agent doesn't have to relearn them by reintroducing the same bugs.

Both are included in the published npm package (`node_modules/space2space/llms.txt` and `node_modules/space2space/skill/SKILL.md`), so they travel with the dependency.

## Contributing

Contributions, issues, and ideas are welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md) before opening a pull request.

## License

MIT © space2space Contributors
