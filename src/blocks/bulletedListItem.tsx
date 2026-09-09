import { createTextBlock } from "./textBlock.js";

export const bulletedListItemBlock = createTextBlock({
  type: "bulletedListItem",
  defaultProps: {},
  continuationType: "bulletedListItem",
  placeholder: "List",
  renderPrefix: () => <span style={{ userSelect: "none" }}>•</span>,
  slashMenu: { label: "Bulleted list", keywords: ["bullet", "list", "ul"] },
});
