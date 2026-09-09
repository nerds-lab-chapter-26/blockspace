import { createTextBlock } from "./textBlock.js";

export interface NumberedListItemProps extends Record<string, unknown> {
  /** Injected transiently by BlockEditor/BlockRenderer based on position among sibling numbered items; not persisted. */
  listNumber?: number;
}

export const numberedListItemBlock = createTextBlock<NumberedListItemProps>({
  type: "numberedListItem",
  defaultProps: {},
  continuationType: "numberedListItem",
  placeholder: "List",
  renderPrefix: (props) => (
    <span style={{ userSelect: "none", minWidth: 18 }}>{props.listNumber ?? 1}.</span>
  ),
  slashMenu: { label: "Numbered list", keywords: ["numbered", "list", "ol", "ordered"] },
});
