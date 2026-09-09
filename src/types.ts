export type BlockId = string;

export interface InlineMark {
  type: "bold" | "italic" | "underline" | "strikethrough" | "code" | "link";
  href?: string;
}

export interface InlineContent {
  type: "text";
  text: string;
  marks: InlineMark[];
}

export interface BaseBlock<
  TType extends string = string,
  TProps extends Record<string, unknown> = Record<string, unknown>
> {
  id: BlockId;
  type: TType;
  props: TProps;
  content?: InlineContent[];
  children?: BaseBlock[];
  meta?: {
    createdAt?: string;
    updatedAt?: string;
  };
}

export type Block = BaseBlock;

export const DOCUMENT_SCHEMA_VERSION = 1 as const;

export interface BlockDocument {
  version: typeof DOCUMENT_SCHEMA_VERSION;
  blocks: Block[];
}
