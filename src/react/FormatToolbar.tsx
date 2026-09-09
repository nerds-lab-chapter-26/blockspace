import { useState } from "react";

export interface FormatToolbarProps {
  top: number;
  left: number;
  onFormat: (command: string, value?: string) => void;
}

const BUTTONS: Array<{ command: string; label: string; icon: string }> = [
  { command: "bold", label: "Bold", icon: "B" },
  { command: "italic", label: "Italic", icon: "I" },
  { command: "underline", label: "Underline", icon: "U" },
  { command: "strikeThrough", label: "Strikethrough", icon: "S" },
  { command: "code", label: "Inline code", icon: "<>" },
];

export function FormatToolbar({ top, left, onFormat }: FormatToolbarProps) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [url, setUrl] = useState("");

  return (
    <div
      role="toolbar"
      aria-label="Text formatting"
      style={{
        position: "fixed",
        top: top - 44,
        left,
        zIndex: 30,
        display: "flex",
        alignItems: "center",
        gap: 2,
        background: "#111",
        color: "white",
        borderRadius: 8,
        padding: 4,
        boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
      }}
      // mousedown, not click: clicking would first blur the contentEditable and collapse the selection
      onMouseDown={(e) => e.preventDefault()}
    >
      {linkOpen ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (url.trim()) onFormat("createLink", url.trim());
            setLinkOpen(false);
            setUrl("");
          }}
        >
          <input
            autoFocus
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setLinkOpen(false);
            }}
            placeholder="Paste a URL, press Enter"
            style={{
              font: "inherit",
              fontSize: "0.85em",
              padding: "4px 6px",
              borderRadius: 4,
              border: "none",
              width: 180,
            }}
          />
        </form>
      ) : (
        <>
          {BUTTONS.map((btn) => (
            <button
              key={btn.command}
              type="button"
              aria-label={btn.label}
              title={btn.label}
              onClick={() => onFormat(btn.command)}
              style={buttonStyle}
            >
              {btn.icon}
            </button>
          ))}
          <button
            type="button"
            aria-label="Link"
            title="Link"
            onClick={() => setLinkOpen(true)}
            style={buttonStyle}
          >
            🔗
          </button>
        </>
      )}
    </div>
  );
}

const buttonStyle = {
  background: "transparent",
  border: "none",
  color: "white",
  width: 28,
  height: 28,
  borderRadius: 4,
  cursor: "pointer",
  fontSize: "0.85em",
  fontWeight: 600,
};
