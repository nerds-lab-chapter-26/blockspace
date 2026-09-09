import { FUN_QUOTES, randomFrom } from "./quotes.js";

let printed = false;

/** Prints a small, once-per-page-load message to the browser console. Purely cosmetic, zero UI
 * impact, and only visible to anyone who happens to have devtools open -- not gated behind
 * `funMode` since there's nothing here for a consuming app's users to be surprised by. */
export function printConsoleEasterEgg(): void {
  if (printed || typeof console === "undefined" || typeof window === "undefined") return;
  printed = true;
  console.log(
    "%c space2space %c block editor, built from scratch\n%c" + randomFrom(FUN_QUOTES),
    "background:#111;color:#fff;padding:2px 6px;border-radius:4px 0 0 4px;font-weight:bold;",
    "background:#eee;color:#111;padding:2px 6px;border-radius:0 4px 4px 0;",
    "color:#888;font-style:italic;"
  );
}
