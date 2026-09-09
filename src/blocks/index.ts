import { createBlockRegistry, type AnyBlockDefinition, type BlockRegistry } from "../registry.js";
import { paragraphBlock } from "./paragraph.js";
import { headingBlock } from "./heading.js";
import { bulletedListItemBlock } from "./bulletedListItem.js";
import { numberedListItemBlock } from "./numberedListItem.js";
import { todoBlock } from "./todo.js";
import { quoteBlock } from "./quote.js";
import { calloutBlock } from "./callout.js";
import { codeBlock } from "./code.js";
import { dividerBlock } from "./divider.js";
import { imageBlock } from "./image.js";

export const defaultBlocks: AnyBlockDefinition[] = [
  paragraphBlock,
  headingBlock,
  bulletedListItemBlock,
  numberedListItemBlock,
  todoBlock,
  quoteBlock,
  calloutBlock,
  codeBlock,
  dividerBlock,
  imageBlock,
];

/** A registry pre-populated with all V1 block types. Call `.register()` on it to add your own. */
export function createDefaultRegistry(): BlockRegistry {
  return createBlockRegistry(defaultBlocks);
}

export {
  paragraphBlock,
  headingBlock,
  bulletedListItemBlock,
  numberedListItemBlock,
  todoBlock,
  quoteBlock,
  calloutBlock,
  codeBlock,
  dividerBlock,
  imageBlock,
};
export type { HeadingProps } from "./heading.js";
export type { TodoProps } from "./todo.js";
export type { CalloutProps } from "./callout.js";
export type { CodeProps } from "./code.js";
export type { ImageProps } from "./image.js";
export type { NumberedListItemProps } from "./numberedListItem.js";
