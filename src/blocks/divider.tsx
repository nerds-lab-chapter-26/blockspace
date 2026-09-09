import { defineBlock } from "../registry.js";

const hrStyle = { border: "none", borderTop: "1px solid rgba(55,53,47,0.16)", margin: "4px 0" };

export const dividerBlock = defineBlock({
  type: "divider",
  defaultProps: {},
  hasContent: false,
  slashMenu: { label: "Divider", keywords: ["divider", "separator", "hr", "line"] },
  render: () => <hr style={hrStyle} />,
  edit: ({ onEnter, onBackspaceAtStart, onArrowUpAtStart, onArrowDownAtEnd, autoFocus, contentRef }) => (
    <div
      ref={contentRef as never}
      tabIndex={0}
      role="separator"
      aria-label="Divider"
      autoFocus={autoFocus}
      style={{ outline: "none", padding: "4px 0" }}
      onKeyDown={(e) => {
        if (e.key === "Backspace" || e.key === "Delete") {
          e.preventDefault();
          onBackspaceAtStart();
        } else if (e.key === "Enter") {
          e.preventDefault();
          onEnter(0);
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          onArrowUpAtStart();
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          onArrowDownAtEnd();
        }
      }}
    >
      <hr style={hrStyle} />
    </div>
  ),
});
