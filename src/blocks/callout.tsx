import { createTextBlock } from "./textBlock.js";

export interface CalloutProps extends Record<string, unknown> {
  icon: string;
  color: string;
}

export const calloutBlock = createTextBlock<CalloutProps>({
  type: "callout",
  defaultProps: { icon: "💡", color: "#fbf3db" },
  continuationType: "paragraph",
  wrapperStyle: (props) => ({
    background: props.color,
    borderRadius: 6,
    padding: "10px 12px",
  }),
  placeholder: "Callout",
  renderPrefix: (props) => <span aria-hidden="true">{props.icon}</span>,
  slashMenu: { label: "Callout", keywords: ["callout", "note", "info", "highlight"] },
});
