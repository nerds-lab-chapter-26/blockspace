import { createTextBlock } from "./textBlock.js";

export const quoteBlock = createTextBlock({
  type: "quote",
  defaultProps: {},
  as: "blockquote",
  continuationType: "paragraph",
  wrapperStyle: () => ({
    borderLeft: "3px solid currentColor",
    paddingLeft: 12,
    opacity: 0.9,
  }),
  contentStyle: () => ({ fontStyle: "italic" }),
  placeholder: "Quote",
  slashMenu: { label: "Quote", keywords: ["quote", "blockquote", "citation"] },
});
