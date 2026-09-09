# Product Requirements Document: Open-Source Notion-Style Blocks Library

**Working title:** TBD  
**Document status:** Draft v0.1  
**Product type:** Open-source TypeScript/React library  
**License target:** MIT  
**Primary package:** `@scope/blocks` (placeholder until the final name is selected)

---

## 1. Product Summary

This project is a free, open-source toolkit for building Notion-style block workspaces in React applications.

It will give developers reusable UI blocks, a predictable block schema, editing commands, rendering utilities, and backend-agnostic persistence interfaces. A developer should be able to install the package, render an editable workspace, receive portable JSON, and connect it to their own database without depending on a paid hosted API.

The project is not intended to clone the whole Notion product. Its purpose is to provide the reusable block infrastructure that developers repeatedly rebuild while creating documentation systems, internal workspaces, knowledge bases, note-taking applications, project-management tools, and collaborative products.

### One-line value proposition

> Build and persist a customizable Notion-style block workspace in React without depending on a proprietary backend or paid editor API.

---

## 2. Background

The idea emerged while building Autometa Workspace. Implementing a Notion-like experience required combining or recreating several concerns:

- block rendering;
- block creation and deletion;
- type conversion;
- ordering and nesting;
- slash commands;
- drag-and-drop behavior;
- content serialization;
- database persistence;
- read-only rendering;
- future real-time collaboration.

Existing open-source editors solve parts of this problem, particularly rich-text editing. However, developers still need to make architecture decisions and write application-specific code for block identity, workspace structure, persistence, rendering, custom blocks, and backend integration.

This library will focus on that integration layer while remaining free, extensible, and backend-agnostic.

---

## 3. Problem Statement

Developers building block-based products commonly face the following problems:

1. Rich-text editors often model an entire document as editor state rather than exposing application-friendly blocks.
2. Complete Notion-like templates or collaboration services may require paid plans or hosted APIs.
3. Editor output formats differ, making data migration and independent rendering difficult.
4. Persistence is left entirely to the application developer.
5. Custom application blocks—such as tasks, callouts, embeds, records, or domain-specific widgets—are difficult to integrate consistently.
6. Editing and read-only rendering are frequently implemented separately.
7. Developers spend time rebuilding block commands, keyboard behavior, drag handles, slash menus, and serialization.

The product must reduce this repeated work without forcing developers to use a particular database, authentication provider, collaboration service, or API.

---

## 4. Product Goals

### V1 goals

- Provide a stable and documented block data model.
- Provide accessible React components for editing and rendering blocks.
- Support essential text and content blocks.
- Support creating, updating, deleting, moving, nesting, and converting blocks.
- Provide slash-command block insertion.
- Provide drag-and-drop reordering.
- Produce portable, serializable JSON.
- Provide a controlled editor API and change events.
- Allow developers to register custom block types.
- Provide a persistence adapter contract rather than a mandatory backend.
- Provide a local-storage adapter and an in-memory adapter as reference implementations.
- Offer a polished demo and clear installation documentation.

### Long-term goals

- Database adapters for PostgreSQL, Supabase, MongoDB, and other stores.
- Real-time collaboration through optional adapters such as Yjs or Liveblocks.
- Comments, mentions, presence, and document history.
- Notion-style database views.
- Import/export for Markdown and HTML.
- Framework adapters beyond React.
- Optional AI commands that do not lock users into one model provider.

---

## 5. Non-Goals for V1

The first release will not include:

- a full Notion clone;
- user authentication;
- a hosted backend or mandatory cloud account;
- real-time multiplayer editing;
- comments and mentions;
- AI writing features;
- kanban, calendar, gallery, or spreadsheet databases;
- mobile-native SDKs;
- complete Markdown or Notion import fidelity;
- document-level permissions;
- offline conflict resolution;
- billing or commercial hosting.

These exclusions are deliberate. V1 must establish a reliable block model and editing experience before advanced systems are added.

---

## 6. Target Users

### Primary user: React application developer

A developer building a workspace, notes app, documentation tool, CMS, learning platform, or internal product who needs block-based editing but wants to own the data and backend.

### Secondary user: Open-source contributor

A developer who wants to add new blocks, adapters, themes, accessibility improvements, or framework integrations.

### Future user: Product team

A team that needs a customizable block system with optional real-time collaboration and enterprise-specific blocks.

---

## 7. Core User Stories

### Installation and setup

- As a developer, I can install the package and display a working editor with minimal configuration.
- As a developer, I can load existing block JSON into the editor.
- As a developer, I can receive updated JSON when content changes.
- As a developer, I can render the same data in read-only mode.

### Block editing

- As an end user, I can press Enter to create a new paragraph block.
- As an end user, I can type `/` to open a searchable block menu.
- As an end user, I can convert a paragraph into another compatible block type.
- As an end user, I can delete an empty block with Backspace.
- As an end user, I can reorder blocks using a drag handle.
- As an end user, I can indent and outdent supported blocks.
- As an end user, I can undo and redo changes.

### Extension

- As a developer, I can register a custom block with its schema, renderer, editor, icon, and slash-menu metadata.
- As a developer, I can customize colors and spacing without modifying library source code.
- As a developer, I can connect my own persistence implementation.

---

## 8. V1 Block Types

| Block | Required capabilities |
| --- | --- |
| Paragraph | Plain text, inline formatting, placeholder |
| Heading | Levels 1–3, inline formatting |
| Bulleted list item | Nesting, keyboard indentation |
| Numbered list item | Nesting, automatic visual numbering |
| To-do | Checked state, editable text |
| Quote | Editable rich text |
| Callout | Icon, text, configurable background style |
| Code | Language label, plain code content, copy action |
| Divider | Non-text visual separator |
| Image | URL source, alt text, caption, optional upload callback |

The implementation may be released incrementally, but V1 is not complete until all required block types pass their acceptance criteria.

---

## 9. Block Data Model

Every block must have a stable identity and serializable properties.

```ts
export type BlockId = string;

export interface BaseBlock<
  TType extends string = string,
  TProps extends Record<string, unknown> = Record<string, unknown>
> {
  id: BlockId;
  type: TType;
  props: TProps;
  content?: InlineContent[];
  children?: Block[];
  meta?: {
    createdAt?: string;
    updatedAt?: string;
  };
}
```

Example document:

```json
{
  "version": 1,
  "blocks": [
    {
      "id": "blk_01",
      "type": "heading",
      "props": { "level": 1 },
      "content": [{ "type": "text", "text": "Project Notes", "marks": [] }],
      "children": []
    },
    {
      "id": "blk_02",
      "type": "todo",
      "props": { "checked": false },
      "content": [{ "type": "text", "text": "Publish the first release", "marks": [] }],
      "children": []
    }
  ]
}
```

### Data-model rules

- IDs must remain stable when a block moves or changes content.
- Persisted data must contain no React elements, DOM nodes, functions, or provider-specific objects.
- The document must include a schema version.
- Unknown custom block data must not be silently discarded.
- Every schema change after public release must include a migration strategy.
- Ordering will be represented by array position in the portable document format.
- Storage adapters may translate array order into their own position strategy.

---

## 10. Public API Proposal

The exact API may change during the prototype, but V1 should support the following developer experience.

```tsx
import {
  BlockEditor,
  BlockRenderer,
  createBlockRegistry,
  createLocalStorageAdapter,
} from "@scope/blocks";

const registry = createBlockRegistry({
  // custom blocks can be registered here
});

const adapter = createLocalStorageAdapter({
  key: "product-notes",
});

export function Workspace() {
  return (
    <BlockEditor
      documentId="product-notes"
      registry={registry}
      persistence={adapter}
      placeholder="Type '/' for commands"
      onChange={(document) => console.log(document)}
    />
  );
}

export function PublicPage({ document }) {
  return <BlockRenderer document={document} registry={registry} />;
}
```

### Controlled usage

```tsx
<BlockEditor
  value={document}
  onChange={setDocument}
/>
```

### Imperative commands

```ts
editor.insertBlock({ type: "paragraph" });
editor.updateBlock(blockId, patch);
editor.removeBlock(blockId);
editor.moveBlock(blockId, target);
editor.convertBlock(blockId, "heading", { level: 2 });
editor.focusBlock(blockId);
editor.undo();
editor.redo();
```

---

## 11. Custom Block Contract

A custom block definition must declare its data rules and user interface.

```ts
const bookmarkBlock = defineBlock({
  type: "bookmark",
  schema: bookmarkSchema,
  defaultProps: {
    url: "",
    title: "",
  },
  slashMenu: {
    label: "Bookmark",
    keywords: ["url", "link", "preview"],
  },
  render: BookmarkRenderer,
  edit: BookmarkEditor,
});
```

Required behavior:

- duplicate block-type registration must fail with a helpful error;
- invalid block data must be rejected or converted through an explicit migration;
- custom blocks must work in both editable and read-only modes;
- custom blocks must participate in selection, movement, deletion, and serialization;
- custom block APIs must not depend on internal implementation details.

---

## 12. Persistence Adapter Contract

The core package must not directly depend on a database or hosted service.

```ts
export interface PersistenceAdapter {
  load(documentId: string): Promise<BlockDocument | null>;
  save(documentId: string, document: BlockDocument): Promise<void>;
  delete?(documentId: string): Promise<void>;
}
```

V1 reference adapters:

- in-memory adapter for tests and demos;
- local-storage adapter for browser prototypes;
- custom-adapter guide for REST APIs.

Persistence requirements:

- saves must be debounced by configuration rather than hard-coded;
- save state must be observable: `idle`, `saving`, `saved`, or `error`;
- failed saves must not discard the current in-memory document;
- the adapter must receive plain serializable data;
- the core must not collect analytics or send content to an external service.

---

## 13. Functional Requirements

### Editor behavior

- The editor must support mouse and keyboard interaction.
- Each visible block must have a stable associated block ID.
- Enter must create or split blocks according to block type.
- Backspace on an empty compatible block must merge or remove it predictably.
- Arrow-key navigation must not trap keyboard users.
- Slash commands must be searchable by title and keywords.
- Drag-and-drop must show the intended drop location.
- Undo and redo must cover content and structural operations.
- Read-only mode must prevent all mutations.

### Inline formatting

V1 should support:

- bold;
- italic;
- underline;
- strikethrough;
- inline code;
- links.

### Serialization

- The editor must export a plain JSON document.
- The exported document must be accepted again without data loss.
- A standalone renderer must render exported JSON without initializing the editor.
- Invalid input must return actionable validation errors.

---

## 14. Non-Functional Requirements

### Accessibility

- Interactive controls must be keyboard accessible.
- Icon-only controls must have accessible names.
- Menus must expose appropriate roles and focus behavior.
- Text and controls must meet WCAG AA color-contrast targets.
- Editing must remain usable at 200% browser zoom.

### Performance

- Typing in a normal document must feel immediate.
- Updating one block should not rerender every block unnecessarily.
- Initial V1 benchmark target: a 500-block document remains practically editable on a modern desktop browser.
- Performance benchmarks must be documented and measured before claiming a specific capacity.

### Security

- Rendered links must use safe URL handling.
- HTML content must be sanitized before rendering.
- The core must not execute scripts from stored block content.
- Image and embed URLs must be validated through configurable policies.
- Unsafe raw HTML will not be a built-in V1 block.
- Dependencies must be monitored for known vulnerabilities.

### Compatibility

- TypeScript must be a first-class supported experience.
- The initial UI package will target React applications.
- Server-side rendering must not access browser-only globals during module import.
- Supported React, browser, and Node versions must be explicitly documented before release.

---

## 15. Technical Architecture

Recommended monorepo structure:

```text
blocks-library/
├── apps/
│   ├── docs/                 # Documentation and examples
│   └── playground/           # Manual testing application
├── packages/
│   ├── core/                 # Schemas, commands, state, migrations
│   ├── react/                # React editor and renderer components
│   ├── blocks-basic/         # Official V1 blocks
│   ├── adapter-memory/       # In-memory persistence
│   ├── adapter-localstorage/ # Browser persistence
│   └── theme-default/        # Optional default styles
├── examples/
│   └── nextjs/
├── tests/
├── PRD.md
├── CONTRIBUTING.md
└── package.json
```

### Proposed technology choices

- TypeScript for all public packages;
- React for the first UI adapter;
- a mature editing engine such as ProseMirror/Tiptap or Lexical, selected after a technical spike;
- Zod or an equivalent runtime schema validator;
- dnd-kit or an equivalent accessible drag-and-drop primitive;
- Vitest for unit tests;
- React Testing Library for behavior tests;
- Playwright for end-to-end keyboard and editing flows;
- Storybook or the documentation playground for isolated block development;
- pnpm workspaces and Turborepo for monorepo management.

No editor engine is approved merely because it is popular. The technical spike must compare customization control, bundle cost, nested blocks, serialization, SSR behavior, accessibility, maintenance health, and license compatibility.

---

## 16. Technical Spike: Build vs Extend

Before production implementation, create small prototypes using the strongest candidate foundations.

Evaluate each candidate against:

| Criterion | Question |
| --- | --- |
| Block identity | Can every block retain a stable external ID? |
| Nested blocks | Can blocks be nested and moved reliably? |
| Custom blocks | Can consumers define blocks without patching internals? |
| Portable schema | Can editor state map cleanly to our public JSON? |
| Read-only rendering | Can data render without mounting the complete editor? |
| Keyboard behavior | Can Notion-like Enter, Backspace, Tab, and arrows be implemented? |
| SSR | Can the package be imported safely in Next.js? |
| Accessibility | Are menus, selections, and controls accessible? |
| License | Can the full required V1 be released under MIT? |
| Maintenance | Is the foundation active and sufficiently documented? |

### Spike deliverable

A short Architecture Decision Record must recommend one of the following:

1. extend an existing editor engine;
2. create a thin integration over an existing block editor;
3. build a custom engine only if neither option satisfies the public schema and extensibility requirements.

Building text-editing internals from scratch is the last option because cursor behavior, browser selection, input methods, accessibility, and undo history are complex systems.

---

## 17. Testing Requirements

### Unit tests

- schema validation;
- document migrations;
- insert, update, delete, move, indent, and convert commands;
- serialization round trips;
- adapter behavior;
- custom block registration.

### Integration tests

- keyboard block creation and deletion;
- slash-menu filtering and selection;
- drag-and-drop ordering;
- controlled and uncontrolled editor modes;
- save success and failure states;
- editor-to-renderer data compatibility.

### End-to-end tests

- create a complete sample document using only the keyboard;
- reload persisted content without loss;
- edit a nested list and preserve its structure;
- register and use a custom block;
- render the saved document in read-only mode;
- verify that unsafe content is not executed.

---

## 18. V1 Acceptance Criteria

V1 is ready when all of the following are true:

- A new React developer can run the quick start in under 10 minutes.
- The package supports all V1 block types.
- Blocks can be inserted, edited, removed, converted, nested, and reordered.
- The slash menu and essential keyboard behaviors work.
- Controlled and persistence-adapter usage are documented.
- The same JSON works in the editor and standalone renderer.
- A custom block can be implemented from public documentation alone.
- Core workflows have automated tests.
- No critical or high-severity known dependency vulnerability remains unresolved at release time.
- The demo works in the documented supported browsers.
- Accessibility checks cover keyboard navigation, labels, focus, and contrast.
- Package exports, TypeScript declarations, license, changelog, and contribution guide are present.

---

## 19. Delivery Plan

### Phase 0 — Validation and research

- Document the exact problems encountered in Autometa Workspace.
- Compare BlockNote, Editor.js, Plate, Tiptap/ProseMirror, and Lexical.
- Interview or collect feedback from at least five developers who have built an editor or workspace.
- Confirm the product boundary and select the editor foundation.
- Write the first Architecture Decision Record.

**Exit condition:** evidence shows which problems remain painful and which foundation supports the design.

### Phase 1 — Core model

- Define document and inline-content schemas.
- Implement IDs, validation, commands, and serialization.
- Implement schema-version handling and the first migration test.
- Build the in-memory adapter.

**Exit condition:** core operations work without React or a database.

### Phase 2 — React editing MVP

- Implement paragraph, heading, list, to-do, quote, and divider blocks.
- Implement selection, insertion, deletion, conversion, and keyboard behavior.
- Implement the slash menu and basic toolbar.
- Implement the standalone renderer.

**Exit condition:** a user can create and reload a useful text document.

### Phase 3 — Structure and media

- Add nesting and drag-and-drop.
- Add code, callout, and image blocks.
- Add undo/redo.
- Add local-storage persistence and save-state UI.

**Exit condition:** all V1 block types and structural operations work.

### Phase 4 — Public release preparation

- Finalize package exports and naming.
- Complete tests, documentation, examples, and accessibility review.
- Publish release candidate packages.
- Test installation in a clean Next.js example.
- Collect feedback and fix release blockers.

**Exit condition:** every V1 acceptance criterion is satisfied.

---

## 20. Success Metrics

Initial success will be measured by usefulness and reliability rather than GitHub stars alone.

- Time for a new developer to render the first editor.
- Time required to connect a custom REST persistence adapter.
- Percentage of documented quick-start attempts completed without assistance.
- Open bug count affecting data loss or core keyboard behavior.
- Number of external applications using the package.
- Number of community-created blocks or adapters.
- Repeat contributors and resolved issues.
- Bundle size and performance benchmark trends across releases.

No adoption target should be presented as a forecast until the first public release establishes a baseline.

---

## 21. Risks and Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Scope grows into a complete Notion clone | Release never ships | Enforce V1 non-goals and phase gates |
| Editing engine fights the public block model | Fragile architecture | Complete the technical spike before implementation |
| Browser selection and keyboard bugs | Poor user experience | Use a mature editing foundation and test keyboard flows |
| Stored documents break after updates | User data loss | Version schemas and require migrations |
| Custom blocks rely on internals | Ecosystem breaks frequently | Keep a small, tested public extension contract |
| React rerenders reduce typing performance | Editor feels slow | Isolate block state and add performance benchmarks |
| Unsafe HTML or URLs execute | Security vulnerability | Sanitize content and exclude raw HTML from V1 |
| Existing tools already meet the same need | Weak differentiation | Validate with developers and focus on portable persistence |
| Maintainer workload becomes excessive | Project becomes inactive | Modular packages, contribution docs, and strict scope control |

---

## 22. Open Product Decisions

These questions must be answered during Phase 0:

1. What exact limitations caused the most work in Autometa Workspace?
2. Is the strongest differentiator persistence, custom application blocks, workspace structure, or a combination of them?
3. Should V1 support nested child arrays, flat parent IDs, or both through adapters?
4. Which editor foundation best preserves stable external block IDs?
5. Should the default UI use unstyled primitives, a bundled theme, or both?
6. Which inline-content representation provides long-term portability?
7. What is the final package name and npm scope?
8. Which browser and React versions will the first release officially support?
9. Is image uploading callback-only, or should an optional adapter be defined?
10. Which features from Autometa Workspace can become the first real integration test?

---

## 23. Immediate Next Actions

Work must begin in this order:

1. Write a short retrospective of the Autometa Workspace block implementation.
2. Create a comparison table for the five candidate foundations.
3. Build the same tiny prototype in the top two candidates:
   - paragraph and to-do blocks;
   - stable IDs;
   - slash insertion;
   - JSON export;
   - read-only rendering.
4. Write `ADR-001-editor-foundation.md` and select the foundation using evidence.
5. Freeze the V1 block schema.
6. Scaffold the monorepo only after the foundation decision.
7. Implement the core command layer before adding visual polish.

### First milestone

The first milestone is complete when a developer can create, edit, reorder, save, reload, and independently render a document containing paragraphs, headings, and to-do blocks.

---

## 24. Definition of Done for Every Feature

A feature is not complete merely because it works in the demo. It is complete only when:

- its public behavior is documented;
- TypeScript types are exported;
- invalid inputs are handled;
- keyboard interaction is tested where applicable;
- serialization is tested;
- editable and read-only modes agree;
- accessibility labels and focus behavior are verified;
- no unrelated block is rerendered unnecessarily;
- the changelog records user-visible behavior.

---

## 25. Product Principle

> The developer owns the data, chooses the backend, controls the UI, and can leave without rewriting stored content.

Every major technical or product decision should be evaluated against this principle.
