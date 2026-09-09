import { useState } from "react";
import { defineBlock, type BlockEditProps, type BlockRenderProps } from "../registry.js";

export interface ImageProps extends Record<string, unknown> {
  src: string;
  alt: string;
  caption: string;
}

const wrapperStyle = { display: "flex", flexDirection: "column" as const, gap: 6 };
const imgStyle = { maxWidth: "100%", borderRadius: 4, display: "block" };
const captionStyle = {
  fontSize: "0.85em",
  color: "rgba(55,53,47,0.65)",
  border: "none",
  outline: "none",
  background: "transparent",
  width: "100%",
};

function ImageRender({ props }: BlockRenderProps<ImageProps>) {
  if (!props.src) return null;
  return (
    <figure style={{ ...wrapperStyle, margin: 0 }}>
      <img src={props.src} alt={props.alt} style={imgStyle} />
      {props.caption ? <figcaption style={captionStyle}>{props.caption}</figcaption> : null}
    </figure>
  );
}

function ImageEdit({
  props,
  onChangeProps,
  onEnter,
  onBackspaceAtStart,
  onArrowUpAtStart,
  onArrowDownAtEnd,
  autoFocus,
  contentRef,
}: BlockEditProps<ImageProps>) {
  const [draftUrl, setDraftUrl] = useState("");

  if (!props.src) {
    return (
      <form
        style={{ display: "flex", gap: 8 }}
        onSubmit={(e) => {
          e.preventDefault();
          if (draftUrl.trim()) onChangeProps({ src: draftUrl.trim() });
        }}
      >
        <input
          ref={contentRef as never}
          type="url"
          required
          autoFocus={autoFocus}
          placeholder="Paste an image URL and press Enter"
          value={draftUrl}
          aria-label="Image URL"
          onChange={(e) => setDraftUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && draftUrl === "") {
              e.preventDefault();
              onBackspaceAtStart();
            } else if (e.key === "ArrowUp") {
              onArrowUpAtStart();
            } else if (e.key === "ArrowDown") {
              onArrowDownAtEnd();
            }
          }}
          style={{ flex: 1, padding: "6px 8px", borderRadius: 4, border: "1px solid rgba(55,53,47,0.2)" }}
        />
      </form>
    );
  }

  return (
    <div
      ref={contentRef as never}
      tabIndex={0}
      style={{ ...wrapperStyle, outline: "none" }}
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
      <img src={props.src} alt={props.alt} style={imgStyle} />
      <input
        value={props.caption}
        placeholder="Add a caption"
        aria-label="Image caption"
        onChange={(e) => onChangeProps({ caption: e.target.value })}
        style={captionStyle}
      />
    </div>
  );
}

export const imageBlock = defineBlock<string, ImageProps>({
  type: "image",
  defaultProps: { src: "", alt: "", caption: "" },
  hasContent: false,
  slashMenu: { label: "Image", keywords: ["image", "picture", "photo", "embed"] },
  render: ImageRender,
  edit: ImageEdit,
});
