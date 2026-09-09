import type { CSSProperties, ReactNode } from "react";
import { EditableRichText } from "../react/EditableRichText.js";
import { renderInlineContent } from "../react/InlineRenderer.js";
import { defineBlock, type BlockDefinition, type SlashMenuMeta } from "../registry.js";
import type { InlineContent } from "../types.js";

type EditTag = "div" | "h1" | "h2" | "h3" | "h4" | "blockquote";

export interface TextBlockOptions<TProps extends Record<string, unknown>> {
  type: string;
  defaultProps: TProps;
  as?: EditTag | ((props: TProps) => EditTag);
  continuationType?: string;
  slashMenu?: SlashMenuMeta;
  slashMenuItems?: SlashMenuMeta[];
  isEmpty?: (props: TProps, content: InlineContent[] | undefined) => boolean;
  wrapperStyle?: (props: TProps) => CSSProperties;
  contentStyle?: (props: TProps) => CSSProperties;
  placeholder?: string | ((props: TProps) => string);
  /** Renders fixed chrome before the text, e.g. a bullet, checkbox, or callout icon. `editable` is false in the read-only renderer. */
  renderPrefix?: (
    props: TProps,
    onChangeProps: (patch: Partial<TProps>) => void,
    editable: boolean
  ) => ReactNode;
}

/** Builds a standard rich-text block definition (paragraph, heading, quote, todo, list items, callout all share this shape). */
export function createTextBlock<TProps extends Record<string, unknown>>(
  options: TextBlockOptions<TProps>
): BlockDefinition<string, TProps> {
  const resolvePlaceholder = (props: TProps): string | undefined =>
    typeof options.placeholder === "function" ? options.placeholder(props) : options.placeholder;

  const resolveTag = (props: TProps): EditTag =>
    typeof options.as === "function" ? options.as(props) : options.as ?? "div";

  return defineBlock<string, TProps>({
    type: options.type,
    defaultProps: options.defaultProps,
    continuationType: options.continuationType,
    slashMenu: options.slashMenu,
    slashMenuItems: options.slashMenuItems,
    isEmpty: options.isEmpty,
    render: ({ props, content, children }) => {
      const Tag = resolveTag(props);
      return (
        <>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 6, ...options.wrapperStyle?.(props) }}>
            {options.renderPrefix?.(props, () => {}, false)}
            <Tag style={{ flex: 1, minWidth: 0, margin: 0, ...options.contentStyle?.(props) }}>
              {renderInlineContent(content) ?? null}
            </Tag>
          </div>
          {children}
        </>
      );
    },
    edit: ({
      props,
      content,
      children,
      onChangeContent,
      onChangeProps,
      onEnter,
      onBackspaceAtStart,
      onIndent,
      onOutdent,
      onArrowUpAtStart,
      onArrowDownAtEnd,
      onSelectionChange,
      autoFocus,
      contentRef,
    }) => (
      <>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 6, ...options.wrapperStyle?.(props) }}>
          {options.renderPrefix?.(props, onChangeProps, true)}
          <EditableRichText
            as={resolveTag(props)}
            className="blockspace-text"
            style={{ flex: 1, minWidth: 0, outline: "none", ...options.contentStyle?.(props) }}
            content={content ?? []}
            onChange={onChangeContent}
            onEnter={onEnter}
            onBackspaceAtStart={onBackspaceAtStart}
            onIndent={onIndent}
            onOutdent={onOutdent}
            onArrowUpAtStart={onArrowUpAtStart}
            onArrowDownAtEnd={onArrowDownAtEnd}
            onSelectionChange={(range) => onSelectionChange?.(range)}
            placeholder={resolvePlaceholder(props)}
            autoFocus={autoFocus}
            contentRef={contentRef}
          />
        </div>
        {children}
      </>
    ),
  });
}
