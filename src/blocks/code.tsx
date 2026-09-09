import { useState } from "react";
import { defineBlock } from "../registry.js";

export interface CodeProps extends Record<string, unknown> {
  language: string;
  code: string;
}

const codeStyle = {
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
  fontSize: "0.9em",
  background: "rgba(135,131,120,0.08)",
  borderRadius: 6,
  padding: "10px 12px",
  whiteSpace: "pre-wrap" as const,
  margin: 0,
};

export const codeBlock = defineBlock<string, CodeProps>({
  type: "code",
  defaultProps: { language: "", code: "" },
  hasContent: false,
  isEmpty: (props) => props.code.trim().length === 0,
  slashMenu: { label: "Code", keywords: ["code", "snippet", "pre"] },
  render: ({ props }) => (
    <div style={{ position: "relative" }}>
      <pre style={codeStyle}>
        <code>{props.code}</code>
      </pre>
      {props.code ? <CopyButton text={props.code} /> : null}
    </div>
  ),
  edit: ({ props, onChangeProps, onEnter, onBackspaceAtStart, autoFocus, contentRef }) => {
    return (
      <div style={{ position: "relative" }}>
        <textarea
          ref={contentRef as never}
          autoFocus={autoFocus}
          value={props.code}
          aria-label="Code"
          spellCheck={false}
          onChange={(e) => onChangeProps({ code: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              onEnter(0);
            } else if (
              e.key === "Backspace" &&
              props.code === "" &&
              e.currentTarget.selectionStart === 0
            ) {
              e.preventDefault();
              onBackspaceAtStart();
            } else if (e.key === "Tab") {
              e.preventDefault();
              const el = e.currentTarget;
              const next = props.code.slice(0, el.selectionStart) + "  " + props.code.slice(el.selectionEnd);
              onChangeProps({ code: next });
            }
          }}
          placeholder="Type or paste code. Ctrl/Cmd+Enter to leave the code block."
          style={{ ...codeStyle, width: "100%", border: "none", outline: "none", resize: "vertical", minHeight: "3em" }}
        />
        {props.code ? <CopyButton text={props.code} /> : null}
      </div>
    );
  },
});

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }}
      style={{
        position: "absolute",
        top: 6,
        right: 6,
        fontSize: "0.75em",
        padding: "2px 8px",
        borderRadius: 4,
        border: "1px solid rgba(55,53,47,0.2)",
        background: "white",
        cursor: "pointer",
      }}
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
