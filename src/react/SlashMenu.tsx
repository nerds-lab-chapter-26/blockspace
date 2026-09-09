import { useEffect, useRef } from "react";
import type { SlashMenuEntry } from "../registry.js";

export interface SlashMenuProps {
  entries: SlashMenuEntry[];
  activeIndex: number;
  onHover: (index: number) => void;
  onSelect: (entry: SlashMenuEntry) => void;
}

export function SlashMenu({ entries, activeIndex, onHover, onSelect }: SlashMenuProps) {
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const active = listRef.current?.querySelector('[aria-selected="true"]');
    if (active && typeof active.scrollIntoView === "function") {
      active.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  return (
    <div
      role="listbox"
      aria-label="Insert a block"
      style={{
        position: "absolute",
        zIndex: 20,
        background: "white",
        border: "1px solid rgba(55,53,47,0.16)",
        borderRadius: 8,
        boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
        minWidth: 220,
        maxHeight: 280,
        overflowY: "auto",
        padding: 4,
      }}
    >
      {entries.length === 0 ? (
        <div style={{ padding: "8px 10px", color: "rgba(55,53,47,0.5)", fontSize: "0.9em" }}>
          No matching blocks
        </div>
      ) : (
        <ul ref={listRef} style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {entries.map((entry, index) => (
            <li key={`${entry.type}:${entry.label}`}>
              <button
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                onMouseEnter={() => onHover(index)}
                // mousedown (not click) so the block's contentEditable doesn't lose focus/selection first
                onMouseDown={(e) => {
                  e.preventDefault();
                  onSelect(entry);
                }}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "6px 10px",
                  borderRadius: 6,
                  border: "none",
                  background: index === activeIndex ? "rgba(55,53,47,0.08)" : "transparent",
                  cursor: "pointer",
                  font: "inherit",
                }}
              >
                {entry.icon ? <span aria-hidden="true" style={{ marginRight: 8 }}>{entry.icon}</span> : null}
                {entry.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
