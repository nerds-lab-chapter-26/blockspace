import { useMemo, useRef, useState } from "react";
import {
  BlockEditor,
  BlockRenderer,
  createDefaultRegistry,
  createLocalStorageAdapter,
  createEmptyDocument,
  type BlockDocument,
  type EditorHandle,
  type SaveStatus,
} from "blockspace";

const SAMPLE: BlockDocument = {
  version: 1,
  blocks: [
    { id: "s1", type: "heading", props: { level: 1 }, content: [{ type: "text", text: "Project Notes", marks: [] }] },
    {
      id: "s2",
      type: "paragraph",
      content: [
        { type: "text", text: "This is a ", marks: [] },
        { type: "text", text: "paragraph", marks: [{ type: "bold" }] },
        { type: "text", text: " with ", marks: [] },
        { type: "text", text: "italic", marks: [{ type: "italic" }] },
        { type: "text", text: " and a ", marks: [] },
        { type: "text", text: "link", marks: [{ type: "link", href: "https://example.com" }] },
        { type: "text", text: ".", marks: [] },
      ],
      props: {},
    },
    { id: "s3", type: "todo", props: { checked: true }, content: [{ type: "text", text: "Scaffold the repo", marks: [] }] },
    { id: "s4", type: "todo", props: { checked: false }, content: [{ type: "text", text: "Build the editor", marks: [] }] },
    { id: "s5", type: "bulletedListItem", props: {}, content: [{ type: "text", text: "First point", marks: [] }] },
    { id: "s6", type: "bulletedListItem", props: {}, content: [{ type: "text", text: "Second point", marks: [] }] },
    { id: "s7", type: "quote", props: {}, content: [{ type: "text", text: "Ship early, ship often.", marks: [] }] },
    { id: "s8", type: "callout", props: { icon: "💡", color: "#fbf3db" }, content: [{ type: "text", text: "Type '/' anywhere to insert a block.", marks: [] }] },
    { id: "s9", type: "divider", props: {} },
    { id: "s10", type: "code", props: { language: "", code: "console.log('hello from blockspace');" } },
  ],
};

export function App() {
  const registry = useMemo(() => createDefaultRegistry(), []);
  const adapter = useMemo(() => createLocalStorageAdapter({ keyPrefix: "blockspace-playground:" }), []);
  const editorRef = useRef<EditorHandle>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [showRenderer, setShowRenderer] = useState(true);
  const [liveDoc, setLiveDoc] = useState<BlockDocument>(createEmptyDocument());

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", maxWidth: 1100, margin: "0 auto", padding: "24px 20px" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h1 style={{ fontSize: "1.1em" }}>blockspace playground</h1>
        <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: "0.85em" }}>
          <span data-testid="save-status">Save: {saveStatus}</span>
          <button onClick={() => editorRef.current?.undo()}>Undo</button>
          <button onClick={() => editorRef.current?.redo()}>Redo</button>
          <button
            onClick={() => {
              adapter.save("playground-doc", SAMPLE).then(() => window.location.reload());
            }}
          >
            Load sample doc
          </button>
          <label>
            <input
              type="checkbox"
              checked={showRenderer}
              onChange={(e) => setShowRenderer(e.target.checked)}
            />{" "}
            Show read-only preview
          </label>
        </div>
      </header>

      <div style={{ display: "flex", gap: 24 }}>
        <div style={{ flex: 1, minWidth: 0, border: "1px solid #eee", borderRadius: 8, padding: 20 }}>
          <BlockEditor
            ref={editorRef}
            documentId="playground-doc"
            registry={registry}
            persistence={adapter}
            onSaveStatusChange={setSaveStatus}
            onChange={setLiveDoc}
            placeholder="Type '/' for commands"
          />
        </div>
        {showRenderer && (
          <div style={{ flex: 1, minWidth: 0, border: "1px solid #eee", borderRadius: 8, padding: 20 }}>
            <div style={{ fontSize: "0.75em", color: "#888", marginBottom: 8 }}>
              Read-only BlockRenderer — same document, no editor mounted
            </div>
            <BlockRenderer document={liveDoc} registry={registry} />
          </div>
        )}
      </div>
    </div>
  );
}
