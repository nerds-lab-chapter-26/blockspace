import { createTextBlock } from "./textBlock.js";

export interface TodoProps extends Record<string, unknown> {
  checked: boolean;
}

export const todoBlock = createTextBlock<TodoProps>({
  type: "todo",
  defaultProps: { checked: false },
  continuationType: "todo",
  contentStyle: (props) => ({
    textDecoration: props.checked ? "line-through" : "none",
    opacity: props.checked ? 0.6 : 1,
  }),
  placeholder: "To-do",
  renderPrefix: (props, onChangeProps, editable) => (
    <input
      type="checkbox"
      checked={props.checked}
      disabled={!editable}
      aria-label={props.checked ? "Mark as not done" : "Mark as done"}
      onMouseDown={(e) => e.preventDefault()}
      onChange={() => onChangeProps({ checked: !props.checked })}
      style={{ marginTop: 4, cursor: editable ? "pointer" : "default" }}
    />
  ),
  slashMenu: { label: "To-do", keywords: ["todo", "task", "checkbox", "checklist"] },
});
