# blockspace

Open-source, backend-agnostic building blocks for Notion-style editing in React.

Most block editors either lock you into a hosted API, or hand you a raw rich-text engine and leave you to build block identity, persistence, and custom blocks yourself. Blockspace is the missing layer in between: a typed block schema, editing commands, and a persistence contract you can wire up to whatever backend you already use — your own database, a REST API, or nothing at all.

You own the data. You choose the backend. You control the UI.

## Status

This project is in early, active development. The core document schema is the first thing being built — the React editor, block components, and slash-menu UI come next. If you're looking for something production-ready today, see [BlockNote](https://www.blocknotejs.org/) or [Plate](https://platejs.org/) in the meantime.

Track progress and design decisions in [PRD.md](./PRD.md).

## Install

```bash
npm install blockspace
```

## Quick example

```ts
import { createEmptyDocument, isBlockDocument } from "blockspace";

const doc = createEmptyDocument();
// { version: 1, blocks: [] }

isBlockDocument(doc); // true
```

The React editor and renderer components (`BlockEditor`, `BlockRenderer`) are not built yet — right now the package exports the core document types and a couple of small helpers. See the roadmap in PRD.md for what's coming.

## Why another block editor library

A handful of open-source editors already exist. What's missing, consistently, is:

- a persistence layer that doesn't assume a specific database or hosted service;
- a small, stable contract for registering custom application blocks;
- a document format that renders the same whether you're editing or just displaying it.

Blockspace is being built to close that gap, not to replace Notion.

## Contributing

Contributions, issues, and ideas are welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md) before opening a pull request.

## License

MIT © Blockspace Contributors
