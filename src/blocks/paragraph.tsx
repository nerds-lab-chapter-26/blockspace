import { createTextBlock } from "./textBlock.js";

export const paragraphBlock = createTextBlock({
  type: "paragraph",
  defaultProps: {},
  placeholder: "Type '/' for commands",
  slashMenu: { label: "Text", keywords: ["paragraph", "text", "plain"] },
});
