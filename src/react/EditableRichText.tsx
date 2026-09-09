import { useLayoutEffect, useRef } from "react";
import type { CSSProperties, ClipboardEvent, CompositionEvent, FormEvent, KeyboardEvent } from "react";
import type { InlineContent } from "../types.js";
import { domToInline, inlineToText } from "../inline/serialize.js";
import { inlineToHtml } from "../inline/html.js";
import { getCaretOffset, setCaretOffset } from "../dom/caret.js";

export interface EditableRichTextProps {
  content: InlineContent[];
  onChange: (content: InlineContent[]) => void;
  onEnter: (caretOffset: number) => void;
  onBackspaceAtStart: () => void;
  onIndent?: () => void;
  onOutdent?: () => void;
  onArrowUpAtStart?: () => void;
  onArrowDownAtEnd?: () => void;
  onSelectionChange?: (range: Range | null, container: HTMLElement) => void;
  /** Called with the caret offset and the pasted text split into lines. Pasting always inserts
   * plain text -- preserving rich formatting/structure from arbitrary clipboard HTML (Word, Google
   * Docs, web pages) is out of scope for now; this keeps paste predictable and safe. */
  onPaste?: (caretOffset: number, lines: string[]) => void;
  placeholder?: string;
  autoFocus?: boolean;
  as?: "div" | "h1" | "h2" | "h3" | "h4" | "blockquote";
  className?: string;
  style?: CSSProperties;
  contentRef?: (el: HTMLElement | null) => void;
  /** Ignores marks entirely and treats content as one unmarked text run. Used by the code block. */
  plainText?: boolean;
}

/**
 * A single block's editable text surface.
 *
 * This is the trickiest piece of building a block editor without an existing rich-text engine:
 * the browser owns the caret and native typing/IME behavior inside contentEditable, but React
 * wants to own rendering. The DOM must NEVER be updated declaratively from `content` on every
 * render -- reassigning innerHTML (even to text that's already there) resets the caret to the
 * start of the element, which is indistinguishable from typing backwards one keystroke at a time.
 *
 * So content is synced imperatively, in a layout effect, and only when the new `content` reference
 * didn't come from this component's own `onChange` in the first place. Self-originated changes
 * (typing, execCommand formatting) are already reflected in the live DOM by the browser itself --
 * we just record what we saw so the effect can recognize it and do nothing. External changes
 * (initial mount, undo/redo, a controlled `value` reset) are the only ones that touch the DOM here.
 *
 * IME composition (Chinese/Japanese/Korean input, and some Urdu/Arabic layouts) fires intermediate
 * "input" events while the user is still choosing characters via the OS's composition UI. Syncing
 * those to React state -- and thus potentially re-rendering -- can interrupt the composition UI
 * mid-edit. So input is ignored entirely while composing, and flushed once on compositionend.
 */
export function EditableRichText({
  content,
  onChange,
  onEnter,
  onBackspaceAtStart,
  onIndent,
  onOutdent,
  onArrowUpAtStart,
  onArrowDownAtEnd,
  onSelectionChange,
  onPaste,
  placeholder,
  autoFocus,
  as = "div",
  className,
  style,
  contentRef,
  plainText,
}: EditableRichTextProps) {
  const elRef = useRef<HTMLElement | null>(null);
  const lastRenderedContent = useRef<InlineContent[] | null>(null);
  const isComposing = useRef(false);

  const computeHtml = (): string =>
    plainText ? escapeForPlainText(inlineToText(content)) : inlineToHtml(content);

  useLayoutEffect(() => {
    const el = elRef.current;
    if (!el) return;
    if (lastRenderedContent.current === content) {
      // Our own change (typing, a formatting shortcut) -- the DOM already has it natively.
      return;
    }
    el.innerHTML = computeHtml();
    lastRenderedContent.current = content;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);

  useLayoutEffect(() => {
    if (autoFocus && elRef.current) {
      elRef.current.focus();
      setCaretOffset(elRef.current, inlineToText(content).length);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setRef = (el: HTMLElement | null) => {
    elRef.current = el;
    contentRef?.(el);
  };

  const handleInput = (e: FormEvent<HTMLElement>) => {
    if (isComposing.current) return;
    const el = e.currentTarget;
    if (plainText) {
      const text = el.textContent ?? "";
      const next: InlineContent[] = text ? [{ type: "text", text, marks: [] }] : [];
      lastRenderedContent.current = next;
      onChange(next);
      return;
    }
    const next = domToInline(el);
    lastRenderedContent.current = next;
    onChange(next);
  };

  const handleCompositionEnd = (e: CompositionEvent<HTMLElement>) => {
    isComposing.current = false;
    handleInput({ currentTarget: e.currentTarget } as FormEvent<HTMLElement>);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    const el = elRef.current;
    if (!el) return;

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onEnter(getCaretOffset(el) ?? inlineToText(content).length);
      return;
    }

    if (e.key === "Backspace") {
      if (getCaretOffset(el) === 0) {
        e.preventDefault();
        onBackspaceAtStart();
      }
      return;
    }

    if (e.key === "Tab" && (onIndent || onOutdent)) {
      e.preventDefault();
      if (e.shiftKey) onOutdent?.();
      else onIndent?.();
      return;
    }

    if (e.key === "ArrowUp" && onArrowUpAtStart && getCaretOffset(el) === 0) {
      e.preventDefault();
      onArrowUpAtStart();
      return;
    }

    if (
      e.key === "ArrowDown" &&
      onArrowDownAtEnd &&
      getCaretOffset(el) === inlineToText(content).length
    ) {
      e.preventDefault();
      onArrowDownAtEnd();
      return;
    }

    if (!plainText && (e.metaKey || e.ctrlKey)) {
      const shortcut: Record<string, string> = { b: "bold", i: "italic", u: "underline" };
      const command = shortcut[e.key.toLowerCase()];
      if (command) {
        e.preventDefault();
        document.execCommand(command);
        handleInput({ currentTarget: el } as FormEvent<HTMLElement>);
      }
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLElement>) => {
    if (!onPaste) return;
    const text = e.clipboardData.getData("text/plain");
    if (!text) return;
    e.preventDefault();
    const el = elRef.current;
    const offset = el ? getCaretOffset(el) ?? inlineToText(content).length : 0;
    onPaste(offset, text.split(/\r\n|\r|\n/));
  };

  const reportSelection = () => {
    if (!onSelectionChange || !elRef.current) return;
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
      onSelectionChange(null, elRef.current);
      return;
    }
    onSelectionChange(selection.getRangeAt(0), elRef.current);
  };

  const handleMouseUp = () => reportSelection();

  // Cast to a loosely-typed component: `as` is a small closed union of tag names, but JSX's
  // per-tag event handler overloads make a truly polymorphic element too complex for tsc to unify.
  const Tag = as as unknown as (props: Record<string, unknown>) => JSX.Element;

  return (
    <Tag
      ref={setRef}
      contentEditable
      suppressContentEditableWarning
      onInput={handleInput}
      onKeyDown={handleKeyDown}
      onKeyUp={reportSelection}
      onMouseUp={handleMouseUp}
      onPaste={handlePaste}
      onCompositionStart={() => {
        isComposing.current = true;
      }}
      onCompositionEnd={handleCompositionEnd}
      className={className}
      style={style}
      data-placeholder={placeholder}
      data-blockspace-editable=""
    />
  );
}

function escapeForPlainText(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
