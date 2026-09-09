# space2space

Open-source, backend-agnostic building blocks for Notion-style editing in React.

Most block editors either lock you into a hosted API, or hand you a raw rich-text engine and leave you to build block identity, persistence, and custom blocks yourself. space2space is the missing layer in between: a typed block schema, editing commands, and a persistence contract you can wire up to whatever backend you already use — your own database, a REST API, or nothing at all.

You own the data. You choose the backend. You control the UI.

## Status

Early but functional: a real block editor built from scratch (no ProseMirror/Lexical/Tiptap underneath), not just a schema. All 10 V1 block types work — paragraph, heading, bulleted/numbered lists, to-do, quote, callout, code, divider, image — with typing, Enter/Backspace/Tab keyboard behavior, a slash-command menu, inline formatting (bold/italic/underline/strikethrough/code/link), undo/redo, drag-to-reorder, and a standalone read-only renderer.

Not yet done, roughly in order of what's next: polished default styling/theming, Markdown/HTML import and export, and database adapters beyond in-memory and localStorage (Postgres, Supabase, Mongo).

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

## Why another block editor library

A handful of open-source editors already exist. What's missing, consistently, is:

- a persistence layer that doesn't assume a specific database or hosted service;
- a small, stable contract for registering custom application blocks;
- a document format that renders the same whether you're editing or just displaying it.

space2space is being built to close that gap, not to replace Notion.

## Contributing

Contributions, issues, and ideas are welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md) before opening a pull request.

## License

MIT © space2space Contributors
