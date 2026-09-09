import { createTextBlock } from "./textBlock.js";

export interface HeadingProps extends Record<string, unknown> {
  level: 1 | 2 | 3;
}

const SIZES: Record<1 | 2 | 3, string> = { 1: "1.75em", 2: "1.4em", 3: "1.15em" };

export const headingBlock = createTextBlock<HeadingProps>({
  type: "heading",
  defaultProps: { level: 1 },
  continuationType: "paragraph",
  as: (props) => `h${props.level}` as "h1" | "h2" | "h3",
  contentStyle: (props) => ({ fontSize: SIZES[props.level], fontWeight: 700, margin: 0 }),
  placeholder: (props) => `Heading ${props.level}`,
  slashMenuItems: [
    { label: "Heading 1", keywords: ["h1", "heading", "title"], props: { level: 1 } },
    { label: "Heading 2", keywords: ["h2", "heading", "subtitle"], props: { level: 2 } },
    { label: "Heading 3", keywords: ["h3", "heading"], props: { level: 3 } },
  ],
});
