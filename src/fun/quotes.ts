/** Just for fun -- entirely opt-in, see BlockEditor's `funMode` prop. */
export const FUN_QUOTES: string[] = [
  "A block a day keeps the blank page away.",
  "Ctrl+Z is the closest thing to time travel humans have built so far.",
  "Somewhere, a ProseMirror developer just felt a disturbance.",
  "You've been writing so long your cursor is filing for overtime.",
  "Real writers ship typos. Ship it.",
  "This editor was built from scratch, out of scratch, mostly.",
  "Behind every great diary entry is a slightly concerning number of undo presses.",
  "Fun fact: your last paragraph has more drafts than a government policy.",
  "Plot twist: the blank block was the real villain all along.",
  "Keep going -- the placeholder text believes in you.",
];

export const FUN_PLACEHOLDERS: string[] = [
  "Still there? 👀",
  "Every masterpiece starts with a blank block.",
  "Type '/' for commands, or just stare meaningfully at this text.",
  "This block is judging your indecision. Lovingly.",
  "Go on, write something. Anything. We won't tell.",
];

export function randomFrom(list: string[]): string {
  return list[Math.floor(Math.random() * list.length)]!;
}
