import { createRef } from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { BlockEditor, type EditorHandle } from "./BlockEditor.js";
import { BlockRenderer } from "./BlockRenderer.js";
import { createDefaultRegistry } from "../blocks/index.js";
import { createMemoryAdapter } from "../persistence/memoryAdapter.js";
import type { BlockDocument } from "../types.js";

/** jsdom doesn't simulate the browser's native "typing inserts DOM text" behavior for
 * contentEditable, so tests drive it the way a real keystroke would end up: mutate the element's
 * text directly, then fire the same "input" event our component listens for. */
function typeInto(el: Element, text: string) {
  el.textContent = text;
  fireEvent.input(el);
}

function placeCaretAtEnd(el: HTMLElement) {
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  const selection = window.getSelection()!;
  selection.removeAllRanges();
  selection.addRange(range);
}

function placeCaretAtStart(el: HTMLElement) {
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(true);
  const selection = window.getSelection()!;
  selection.removeAllRanges();
  selection.addRange(range);
}

/** Simulates one real keystroke: inserts a character at the current caret position (the way the
 * browser natively does it), then fires the same "input" event React listens for. Unlike
 * `typeInto`, this drives the component through a real render cycle after every character --
 * which is exactly where a caret-preservation bug would surface. */
function typeCharAtCaret(el: HTMLElement, char: string) {
  const selection = window.getSelection()!;
  const range = selection.getRangeAt(0);
  range.deleteContents();
  const textNode = document.createTextNode(char);
  range.insertNode(textNode);
  range.setStartAfter(textNode);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
  fireEvent.input(el);
}

function getEditableDivs(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll("[data-blockspace-editable]"));
}

describe("BlockEditor", () => {
  it("always shows at least one editable paragraph, even starting from an empty document", () => {
    const registry = createDefaultRegistry();
    const { container } = render(<BlockEditor registry={registry} />);
    expect(getEditableDivs(container)).toHaveLength(1);
  });

  it("typing text updates the document and is reflected via onChange", async () => {
    const registry = createDefaultRegistry();
    let latest: BlockDocument | null = null;
    const { container } = render(
      <BlockEditor registry={registry} onChange={(doc) => (latest = doc)} />
    );
    const el = getEditableDivs(container)[0]!;
    typeInto(el, "hello world");

    await waitFor(() => {
      expect(latest?.blocks[0]?.content?.[0]?.text).toBe("hello world");
    });
  });

  it("typing several characters in sequence keeps them in order, not reversed (regression)", () => {
    // Regression for a real bug: EditableRichText used to reset the contentEditable's innerHTML
    // (via dangerouslySetInnerHTML) after every keystroke because React always saw the HTML string
    // change between renders. Resetting innerHTML collapses the caret to the start of the element,
    // so each new character landed before the previous one -- typing "abc" produced "cba".
    const registry = createDefaultRegistry();
    const { container } = render(<BlockEditor registry={registry} />);
    const el = getEditableDivs(container)[0]!;

    el.focus();
    placeCaretAtStart(el);
    for (const char of "abc") {
      typeCharAtCaret(el, char);
    }

    expect(el.textContent).toBe("abc");
  });

  it("Enter splits the current block and creates a new paragraph after it", async () => {
    const registry = createDefaultRegistry();
    const { container } = render(<BlockEditor registry={registry} />);
    const el = getEditableDivs(container)[0]!;

    typeInto(el, "hello world");
    await waitFor(() => expect(el.textContent).toBe("hello world"));

    placeCaretAtEnd(el);
    // simulate the caret sitting right after "hello" (offset 5)
    const range = document.createRange();
    range.setStart(el.firstChild!, 5);
    range.collapse(true);
    window.getSelection()!.removeAllRanges();
    window.getSelection()!.addRange(range);

    fireEvent.keyDown(el, { key: "Enter" });

    await waitFor(() => expect(getEditableDivs(container)).toHaveLength(2));
    const divs = getEditableDivs(container);
    expect(divs[0]!.textContent).toBe("hello");
    expect(divs[1]!.textContent).toBe(" world");
  });

  it("Backspace at the start of a block merges it into the previous block", async () => {
    const registry = createDefaultRegistry();
    const ref = createRef<EditorHandle>();
    const { container } = render(<BlockEditor ref={ref} registry={registry} />);

    act(() => {
      ref.current!.insertBlock({ type: "paragraph" });
    });

    await waitFor(() => expect(getEditableDivs(container)).toHaveLength(2));
    const [first, second] = getEditableDivs(container);
    typeInto(first!, "foo");
    typeInto(second!, "bar");
    await waitFor(() => expect(second!.textContent).toBe("bar"));

    placeCaretAtStart(second!);
    fireEvent.keyDown(second!, { key: "Backspace" });

    await waitFor(() => expect(getEditableDivs(container)).toHaveLength(1));
    expect(getEditableDivs(container)[0]!.textContent).toBe("foobar");
  });

  it("Backspace does nothing on the only remaining block", async () => {
    const registry = createDefaultRegistry();
    const { container } = render(<BlockEditor registry={registry} />);
    const el = getEditableDivs(container)[0]!;
    placeCaretAtStart(el);
    fireEvent.keyDown(el, { key: "Backspace" });
    expect(getEditableDivs(container)).toHaveLength(1);
  });

  it("typing '/' opens the slash menu and selecting an entry converts the block", async () => {
    const registry = createDefaultRegistry();
    const { container } = render(<BlockEditor registry={registry} />);
    const el = getEditableDivs(container)[0]!;

    typeInto(el, "/head");
    const option = await screen.findByRole("option", { name: /Heading 1/ });
    fireEvent.mouseDown(option);

    await waitFor(() => {
      expect(container.querySelector('[data-block-type="heading"]')).not.toBeNull();
    });
  });

  it("the to-do checkbox toggles the checked prop", async () => {
    const registry = createDefaultRegistry();
    const ref = createRef<EditorHandle>();
    render(<BlockEditor ref={ref} registry={registry} />);

    let id!: string;
    act(() => {
      id = ref.current!.insertBlock({ type: "todo" });
    });

    const checkbox = await screen.findByRole("checkbox");
    expect(checkbox).not.toBeChecked();
    await userEvent.click(checkbox);
    expect(checkbox).toBeChecked();

    const doc = ref.current!.getDocument();
    const todo = doc.blocks.find((b) => b.id === id);
    expect(todo?.props).toEqual({ checked: true });
  });

  it("undo (Ctrl+Z) reverts the last structural change", async () => {
    const registry = createDefaultRegistry();
    const ref = createRef<EditorHandle>();
    const { container } = render(<BlockEditor ref={ref} registry={registry} />);

    act(() => {
      ref.current!.insertBlock({ type: "paragraph" });
    });
    await waitFor(() => expect(getEditableDivs(container)).toHaveLength(2));

    fireEvent.keyDown(container.querySelector("[data-blockspace-editor]")!, {
      key: "z",
      ctrlKey: true,
    });

    await waitFor(() => expect(getEditableDivs(container)).toHaveLength(1));
  });

  it("clicking below a trailing code block adds a new paragraph after it (regression)", async () => {
    // A code block treats Enter as a plain newline, so when it's the last block in the document
    // there was previously no way to get a new block after it without knowing the Ctrl+Enter
    // shortcut. Clicking the trailing area below the last block must always work as an escape hatch.
    const registry = createDefaultRegistry();
    const ref = createRef<EditorHandle>();
    const { container } = render(<BlockEditor ref={ref} registry={registry} />);

    act(() => {
      ref.current!.convertBlock(ref.current!.getDocument().blocks[0]!.id, "code", { code: "x" });
    });
    await waitFor(() => expect(container.querySelector('[data-block-type="code"]')).not.toBeNull());

    const trailingArea = container.querySelector("[data-blockspace-trailing-area]")!;
    fireEvent.click(trailingArea);

    await waitFor(() => {
      const blocks = ref.current!.getDocument().blocks;
      expect(blocks).toHaveLength(2);
      expect(blocks[1]!.type).toBe("paragraph");
    });
  });

  it.each(["divider", "image"])(
    "clicking below a trailing %s block also adds a new paragraph after it",
    async (blockType) => {
      const registry = createDefaultRegistry();
      const ref = createRef<EditorHandle>();
      const { container } = render(<BlockEditor ref={ref} registry={registry} />);

      act(() => {
        ref.current!.convertBlock(ref.current!.getDocument().blocks[0]!.id, blockType);
      });
      await waitFor(() =>
        expect(container.querySelector(`[data-block-type="${blockType}"]`)).not.toBeNull()
      );

      fireEvent.click(container.querySelector("[data-blockspace-trailing-area]")!);

      await waitFor(() => {
        const blocks = ref.current!.getDocument().blocks;
        expect(blocks).toHaveLength(2);
        expect(blocks[1]!.type).toBe("paragraph");
      });
    }
  );

  it("Ctrl+Enter inside a code block still exits it and adds a paragraph after (existing escape hatch)", async () => {
    const registry = createDefaultRegistry();
    const ref = createRef<EditorHandle>();
    render(<BlockEditor ref={ref} registry={registry} />);

    act(() => {
      ref.current!.convertBlock(ref.current!.getDocument().blocks[0]!.id, "code", { code: "x" });
    });
    const textarea = await screen.findByLabelText("Code");
    fireEvent.keyDown(textarea, { key: "Enter", ctrlKey: true });

    await waitFor(() => {
      const blocks = ref.current!.getDocument().blocks;
      expect(blocks).toHaveLength(2);
      expect(blocks[1]!.type).toBe("paragraph");
    });
  });

  it("clicking below an already-empty trailing paragraph focuses it instead of adding a duplicate", async () => {
    const registry = createDefaultRegistry();
    const { container } = render(<BlockEditor registry={registry} />);

    fireEvent.click(container.querySelector("[data-blockspace-trailing-area]")!);

    await waitFor(() => expect(getEditableDivs(container)).toHaveLength(1));
  });

  it("loads an existing document from the persistence adapter on mount", async () => {
    const registry = createDefaultRegistry();
    const adapter = createMemoryAdapter();
    const existing: BlockDocument = {
      version: 1,
      blocks: [{ id: "x1", type: "paragraph", props: {}, content: [{ type: "text", text: "loaded", marks: [] }] }],
    };
    await adapter.save("doc-1", existing);

    const { container } = render(
      <BlockEditor registry={registry} documentId="doc-1" persistence={adapter} />
    );

    await waitFor(() => {
      expect(getEditableDivs(container)[0]!.textContent).toBe("loaded");
    });
  });

  it("BlockEditor and BlockRenderer agree on the same document's text content", async () => {
    const registry = createDefaultRegistry();
    const doc: BlockDocument = {
      version: 1,
      blocks: [
        { id: "a", type: "heading", props: { level: 2 }, content: [{ type: "text", text: "Title", marks: [] }] },
        { id: "b", type: "paragraph", props: {}, content: [{ type: "text", text: "Body text", marks: [] }] },
      ],
    };

    const editor = render(<BlockEditor registry={registry} value={doc} />);
    const renderer = render(<BlockRenderer registry={registry} document={doc} />);

    await waitFor(() => {
      expect(editor.container.textContent).toContain("Title");
      expect(editor.container.textContent).toContain("Body text");
    });
    expect(renderer.container.textContent).toContain("Title");
    expect(renderer.container.textContent).toContain("Body text");

    // the renderer must not mount any contentEditable surface
    expect(renderer.container.querySelector("[data-blockspace-editable]")).toBeNull();
  });
});
