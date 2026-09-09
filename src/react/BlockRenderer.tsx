import type { Block, BlockDocument } from "../types.js";
import type { BlockRegistry } from "../registry.js";

export interface BlockRendererProps {
  document: BlockDocument;
  registry: BlockRegistry;
  className?: string;
}

/**
 * Renders a block document read-only. Does not mount any editor state, contentEditable regions,
 * or keyboard handling — safe to use for public pages, previews, or SSR.
 */
export function BlockRenderer({ document, registry, className }: BlockRendererProps) {
  return (
    <div className={className} data-blockspace-renderer="">
      {renderBlocks(document.blocks, registry)}
    </div>
  );
}

function renderBlocks(blocks: Block[], registry: BlockRegistry) {
  let numberedCounter = 0;

  return blocks.map((block) => {
    const def = registry.get(block.type);
    numberedCounter = block.type === "numberedListItem" ? numberedCounter + 1 : 0;

    if (!def) {
      return (
        <div key={block.id} style={{ color: "#b91c1c", fontSize: "0.85em" }}>
          Unknown block type "{block.type}". Is it registered?
        </div>
      );
    }

    const props =
      block.type === "numberedListItem" ? { ...block.props, listNumber: numberedCounter } : block.props;

    const Render = def.render;
    const children =
      block.children && block.children.length > 0 ? (
        <div style={{ paddingLeft: 22 }}>{renderBlocks(block.children, registry)}</div>
      ) : null;

    return (
      <div key={block.id} data-block-id={block.id} data-block-type={block.type}>
        <Render id={block.id} props={props} content={block.content}>
          {children}
        </Render>
      </div>
    );
  });
}
