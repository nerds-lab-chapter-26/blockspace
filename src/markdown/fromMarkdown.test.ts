import { describe, expect, it } from "vitest";
import { markdownToDocument } from "./fromMarkdown.js";
import { documentToMarkdown } from "./toMarkdown.js";
import { calloutBlock } from "../blocks/callout.js";
import type { Block, InlineContent, InlineMark } from "../types.js";

interface Plain {
  type: string;
  props: Record<string, unknown>;
  content?: InlineContent[];
  children: Plain[];
}

type MarkType = InlineMark["type"];

const byType = (a: InlineMark, b: InlineMark) => a.type.localeCompare(b.type);

/** Ids are random and mark order is an implementation detail, so compare neither. */
function plain(block: Block): Plain {
  const out: Plain = {
    type: block.type,
    props: block.props,
    children: (block.children ?? []).map((child) => plain(child as Block)),
  };
  if (block.content) {
    out.content = block.content.map((run) => ({ ...run, marks: [...run.marks].sort(byType) }));
  }
  return out;
}

function parse(markdown: string): Plain[] {
  return markdownToDocument(markdown).blocks.map(plain);
}

function inline(markdown: string): InlineContent[] {
  return parse(markdown)[0]!.content!;
}

function t(text: string, ...marks: MarkType[]): InlineContent {
  return { type: "text", text, marks: marks.map((type) => ({ type })).sort(byType) };
}

function link(text: string, href: string, ...marks: MarkType[]): InlineContent {
  return { type: "text", text, marks: [...marks.map((type) => ({ type })), { type: "link" as const, href }].sort(byType) };
}

function block(type: string, props: Record<string, unknown>, content?: InlineContent[], children: Plain[] = []): Plain {
  const out: Plain = { type, props, children };
  if (content) out.content = content;
  return out;
}

const CALLOUT_COLOR = calloutBlock.defaultProps.color;

describe("markdownToDocument: document shape", () => {
  it("returns an empty document for empty or whitespace-only input", () => {
    expect(markdownToDocument("")).toEqual({ version: 1, blocks: [] });
    expect(markdownToDocument("  \n\n\t\n")).toEqual({ version: 1, blocks: [] });
  });

  it("gives every block a unique id, including nested ones", () => {
    const doc = markdownToDocument("# a\n\n- b\n  - c\n\nd");
    const ids: string[] = [];
    const collect = (blocks: Block[]) => {
      for (const b of blocks) {
        ids.push(b.id);
        collect((b.children ?? []) as Block[]);
      }
    };
    collect(doc.blocks);
    expect(ids).toHaveLength(4);
    expect(new Set(ids).size).toBe(4);
    expect(ids.every((id) => typeof id === "string" && id.length > 0)).toBe(true);
  });

  it("handles CRLF line endings and a leading BOM", () => {
    expect(parse("\uFEFF# Title\r\n\r\ntext")).toEqual([
      block("heading", { level: 1 }, [t("Title")]),
      block("paragraph", {}, [t("text")]),
    ]);
  });
});

describe("markdownToDocument: paragraphs and line breaks", () => {
  it("splits paragraphs on blank lines", () => {
    expect(parse("one\n\ntwo")).toEqual([
      block("paragraph", {}, [t("one")]),
      block("paragraph", {}, [t("two")]),
    ]);
  });

  it("joins soft-wrapped lines with a space", () => {
    expect(parse("first line\nsecond line\n   third line")).toEqual([
      block("paragraph", {}, [t("first line second line third line")]),
    ]);
  });

  it("treats hard breaks (trailing spaces or a backslash) as a space too", () => {
    expect(inline("one  \ntwo")).toEqual([t("one two")]);
    expect(inline("one\\\ntwo")).toEqual([t("one two")]);
  });
});

describe("markdownToDocument: headings", () => {
  it("parses ATX headings and clamps levels 4-6 to 3", () => {
    const levels = parse("# a\n## b\n### c\n#### d\n##### e\n###### f").map((b) => b.props.level);
    expect(levels).toEqual([1, 2, 3, 3, 3, 3]);
  });

  it("strips closing hashes but keeps a trailing # that belongs to the text", () => {
    expect(inline("## Title ##")).toEqual([t("Title")]);
    expect(inline("# C#")).toEqual([t("C#")]);
  });

  it("does not treat #hashtag or seven hashes as a heading", () => {
    expect(parse("#hashtag")).toEqual([block("paragraph", {}, [t("#hashtag")])]);
    expect(parse("####### seven")[0]!.type).toBe("paragraph");
  });

  it("supports an empty heading", () => {
    expect(parse("#")).toEqual([block("heading", { level: 1 }, [])]);
  });

  it("parses setext headings, including multi-line ones", () => {
    expect(parse("Title\n=====\n\nSub\n---")).toEqual([
      block("heading", { level: 1 }, [t("Title")]),
      block("heading", { level: 2 }, [t("Sub")]),
    ]);
    expect(parse("wrapped\ntitle\n---")).toEqual([block("heading", { level: 2 }, [t("wrapped title")])]);
  });
});

describe("markdownToDocument: dividers", () => {
  it.each(["---", "***", "___", "- - -", "----------", "* * *"])("recognises %s as a divider", (rule) => {
    expect(parse(`before\n\n${rule}\n\nafter`)).toEqual([
      block("paragraph", {}, [t("before")]),
      block("divider", {}),
      block("paragraph", {}, [t("after")]),
    ]);
  });
});

describe("markdownToDocument: lists", () => {
  it("parses bullet lists with any marker", () => {
    expect(parse("- a\n* b\n+ c")).toEqual([
      block("bulletedListItem", {}, [t("a")]),
      block("bulletedListItem", {}, [t("b")]),
      block("bulletedListItem", {}, [t("c")]),
    ]);
  });

  it("parses numbered lists and ignores the start number", () => {
    expect(parse("5. a\n6) b\n1. c")).toEqual([
      block("numberedListItem", {}, [t("a")]),
      block("numberedListItem", {}, [t("b")]),
      block("numberedListItem", {}, [t("c")]),
    ]);
  });

  it("parses task items", () => {
    expect(parse("- [ ] open\n- [x] done\n- [X] also done\n- [x]")).toEqual([
      block("todo", { checked: false }, [t("open")]),
      block("todo", { checked: true }, [t("done")]),
      block("todo", { checked: true }, [t("also done")]),
      block("todo", { checked: true }, []),
    ]);
  });

  it("does not mistake a link whose text is x for a task marker", () => {
    expect(parse("- [x](https://example.com)")).toEqual([
      block("bulletedListItem", {}, [link("x", "https://example.com")]),
    ]);
  });

  it("nests items by indentation, at any depth", () => {
    expect(parse("- parent\n  - child\n    - grandchild\n- sibling")).toEqual([
      block("bulletedListItem", {}, [t("parent")], [
        block("bulletedListItem", {}, [t("child")], [block("bulletedListItem", {}, [t("grandchild")])]),
      ]),
      block("bulletedListItem", {}, [t("sibling")]),
    ]);
  });

  it("nests with four-space and tab indentation", () => {
    const expected = [block("bulletedListItem", {}, [t("a")], [block("bulletedListItem", {}, [t("b")])])];
    expect(parse("- a\n    - b")).toEqual(expected);
    expect(parse("- a\n\t- b")).toEqual(expected);
  });

  it("nests a numbered item under a bullet and keeps the export format's loose spacing", () => {
    expect(parse("- parent\n\n  1. child\n\n  2. child two")).toEqual([
      block("bulletedListItem", {}, [t("parent")], [
        block("numberedListItem", {}, [t("child")]),
        block("numberedListItem", {}, [t("child two")]),
      ]),
    ]);
  });

  it("returns to a shallower level when indentation decreases", () => {
    expect(parse("- a\n  - b\n    - c\n  - d")).toEqual([
      block("bulletedListItem", {}, [t("a")], [
        block("bulletedListItem", {}, [t("b")], [block("bulletedListItem", {}, [t("c")])]),
        block("bulletedListItem", {}, [t("d")]),
      ]),
    ]);
  });

  it("appends indented and lazy continuation lines to the item", () => {
    expect(parse("- one\n  continues\nlazy\n- two")).toEqual([
      block("bulletedListItem", {}, [t("one continues lazy")]),
      block("bulletedListItem", {}, [t("two")]),
    ]);
  });

  it("does not nest a later list under an earlier one across a paragraph", () => {
    expect(parse("- a\n\npara\n\n  - b")).toEqual([
      block("bulletedListItem", {}, [t("a")]),
      block("paragraph", {}, [t("para")]),
      block("bulletedListItem", {}, [t("b")]),
    ]);
  });

  it("only lets an ordered item interrupt a paragraph when it starts at 1", () => {
    expect(parse("The year\n2024. was great")).toEqual([block("paragraph", {}, [t("The year 2024. was great")])]);
    expect(parse("Steps\n1. first")).toEqual([
      block("paragraph", {}, [t("Steps")]),
      block("numberedListItem", {}, [t("first")]),
    ]);
  });

  it("requires a space after the marker", () => {
    expect(parse("-foo")).toEqual([block("paragraph", {}, [t("-foo")])]);
    expect(parse("**bold** start")[0]!.type).toBe("paragraph");
  });

  it("supports an empty list item", () => {
    expect(parse("- a\n-\n- c")).toEqual([
      block("bulletedListItem", {}, [t("a")]),
      block("bulletedListItem", {}, []),
      block("bulletedListItem", {}, [t("c")]),
    ]);
  });
});

describe("markdownToDocument: quotes and callouts", () => {
  it("parses a blockquote and joins its wrapped lines", () => {
    expect(parse("> hello\n> world")).toEqual([block("quote", {}, [t("hello world")])]);
  });

  it("starts a new quote after an empty quoted line", () => {
    expect(parse("> a\n>\n> b")).toEqual([block("quote", {}, [t("a")]), block("quote", {}, [t("b")])]);
  });

  it("flattens nested quotes", () => {
    expect(parse("> outer\n>> inner")).toEqual([block("quote", {}, [t("outer inner")])]);
  });

  it("turns an emoji-led quote into a callout, matching the export format", () => {
    expect(parse("> 💡 remember this")).toEqual([
      block("callout", { icon: "💡", color: CALLOUT_COLOR }, [t("remember this")]),
    ]);
  });

  it("keeps emoji presentation selectors in the icon", () => {
    expect(parse("> ⚠️ careful")[0]!.props.icon).toBe("⚠️");
  });

  it("supports an icon with no text, and does not treat (c) or (tm) as icons", () => {
    expect(parse("> 💡")).toEqual([block("callout", { icon: "💡", color: CALLOUT_COLOR }, [])]);
    expect(parse("> © 2024 Acme")[0]!.type).toBe("quote");
    expect(parse("> ™ brand")[0]!.type).toBe("quote");
  });

  it("parses inline formatting inside quotes and callouts", () => {
    expect(inline("> some **bold** text")).toEqual([t("some "), t("bold", "bold"), t(" text")]);
    expect(inline("> 🔥 a *b*")).toEqual([t("a "), t("b", "italic")]);
  });
});

describe("markdownToDocument: code", () => {
  it("parses a fenced block with a language and preserves its content verbatim", () => {
    const md = "```js\nlet x = 1;\n\n# not a heading\n- not a list\n  indented\n```";
    expect(parse(md)).toEqual([
      block("code", { language: "js", code: "let x = 1;\n\n# not a heading\n- not a list\n  indented" }),
    ]);
  });

  it("supports tilde fences and takes only the first word of the info string", () => {
    expect(parse('~~~python title="x"\nprint(1)\n~~~')).toEqual([
      block("code", { language: "python", code: "print(1)" }),
    ]);
  });

  it("supports an empty fence and an unterminated one", () => {
    expect(parse("```\n```")).toEqual([block("code", { language: "", code: "" })]);
    expect(parse("```sh\nnever closed\nstill code")).toEqual([
      block("code", { language: "sh", code: "never closed\nstill code" }),
    ]);
  });

  it("only closes a fence with a run at least as long as the opener", () => {
    expect(parse("````\na\n```\nb\n````")).toEqual([block("code", { language: "", code: "a\n```\nb" })]);
  });

  it("interrupts a paragraph and lets the next paragraph start fresh", () => {
    expect(parse("before\n```\ncode\n```\nafter")).toEqual([
      block("paragraph", {}, [t("before")]),
      block("code", { language: "", code: "code" }),
      block("paragraph", {}, [t("after")]),
    ]);
  });

  it("strips the fence's indentation from its lines", () => {
    expect(parse("- item\n  ```js\n  x\n    y\n  ```")).toEqual([
      block("bulletedListItem", {}, [t("item")]),
      block("code", { language: "js", code: "x\n  y" }),
    ]);
  });
});

describe("markdownToDocument: images", () => {
  it("parses a lone image line into an image block", () => {
    expect(parse("![a cat](cat.png)")).toEqual([block("image", { src: "cat.png", alt: "a cat", caption: "" })]);
  });

  it("uses an italic line directly after the image as its caption", () => {
    expect(parse("![a cat](cat.png)\n*My cat*")).toEqual([
      block("image", { src: "cat.png", alt: "a cat", caption: "My cat" }),
    ]);
    expect(parse("![a cat](cat.png)\n_My cat_")[0]!.props.caption).toBe("My cat");
  });

  it("does not swallow a normal paragraph after an image", () => {
    expect(parse("![a](b.png)\nnext")).toEqual([
      block("image", { src: "b.png", alt: "a", caption: "" }),
      block("paragraph", {}, [t("next")]),
    ]);
  });

  it("ignores an image title", () => {
    expect(parse('![a](b.png "A title")')[0]!.props.src).toBe("b.png");
  });

  it("keeps only the alt text of an image inside a paragraph", () => {
    expect(inline("see ![logo](l.png) here")).toEqual([t("see logo here")]);
  });

  it("keeps a linked image (a badge) as a link on its alt text", () => {
    expect(inline("[![npm](https://img.shields.io/npm.svg)](https://npmjs.com/p)")).toEqual([
      link("npm", "https://npmjs.com/p"),
    ]);
    expect(inline("[![a](i1.svg)](https://l1.dev)\n[![b](i2.svg)](https://l2.dev)")).toEqual([
      link("a", "https://l1.dev"),
      t(" "),
      link("b", "https://l2.dev"),
    ]);
  });

  it("drops unsafe image sources but keeps safe raster data URIs", () => {
    expect(parse("![x](javascript:alert(1))")[0]!.props.src).toBe("");
    expect(parse("![x](data:image/svg+xml;base64,AAAA)")[0]!.props.src).toBe("");
    expect(parse("![x](data:text/html,<script>alert(1)</script>)")[0]!.props.src).toBe("");
    expect(parse("![x](data:image/png;base64,AAAA)")[0]!.props.src).toBe("data:image/png;base64,AAAA");
  });
});

describe("markdownToDocument: everything else degrades gracefully", () => {
  it("turns table rows into one paragraph each and drops the delimiter row", () => {
    expect(parse("| Name | Age |\n| --- | :---: |\n| Ann | 30 |")).toEqual([
      block("paragraph", {}, [t("Name | Age")]),
      block("paragraph", {}, [t("Ann | 30")]),
    ]);
  });

  it("drops single-line and multi-line HTML comments", () => {
    expect(parse("a\n<!-- gone -->\nb")).toEqual([block("paragraph", {}, [t("a")]), block("paragraph", {}, [t("b")])]);
    expect(parse("a\n\n<!--\nmulti\nline\n-->\n\nb")).toHaveLength(2);
  });

  it("drops YAML front matter but keeps a document that merely starts with a divider", () => {
    expect(parse("---\ntitle: Hi\ntags: [a, b]\n---\n\n# Body")).toEqual([block("heading", { level: 1 }, [t("Body")])]);
    expect(parse("---\n\nText\n\n---")).toEqual([
      block("divider", {}),
      block("paragraph", {}, [t("Text")]),
      block("divider", {}),
    ]);
  });
});

describe("markdownToDocument: inline formatting", () => {
  it("parses bold and italic with either delimiter", () => {
    expect(inline("**b**")).toEqual([t("b", "bold")]);
    expect(inline("__b__")).toEqual([t("b", "bold")]);
    expect(inline("*i*")).toEqual([t("i", "italic")]);
    expect(inline("_i_")).toEqual([t("i", "italic")]);
    expect(inline("***both***")).toEqual([t("both", "bold", "italic")]);
  });

  it("splits runs around formatted text", () => {
    expect(inline("a **b** c")).toEqual([t("a "), t("b", "bold"), t(" c")]);
  });

  it("nests italic inside bold and bold inside italic", () => {
    expect(inline("**bold *nested* bold**")).toEqual([
      t("bold ", "bold"),
      t("nested", "bold", "italic"),
      t(" bold", "bold"),
    ]);
    expect(inline("*italic **bold** italic*")).toEqual([
      t("italic ", "italic"),
      t("bold", "bold", "italic"),
      t(" italic", "italic"),
    ]);
  });

  it("parses strikethrough (double tilde only) and underline", () => {
    expect(inline("~~gone~~")).toEqual([t("gone", "strikethrough")]);
    expect(inline("~single~")).toEqual([t("~single~")]);
    expect(inline("<u>under</u>")).toEqual([t("under", "underline")]);
    expect(inline("<u>open only")).toEqual([t("<u>open only")]);
  });

  it("parses inline code without formatting what is inside it", () => {
    expect(inline("`a *b* c`")).toEqual([t("a *b* c", "code")]);
    expect(inline("`` a`b ``")).toEqual([t("a`b", "code")]);
    expect(inline("x `unclosed")).toEqual([t("x `unclosed")]);
  });

  it("honours backslash escapes", () => {
    expect(inline("\\*not italic\\* and \\[not a link\\]")).toEqual([t("*not italic* and [not a link]")]);
  });

  it("leaves intraword underscores, spaced asterisks, and unmatched delimiters alone", () => {
    expect(inline("snake_case_word")).toEqual([t("snake_case_word")]);
    expect(inline("2 * 3 * 4")).toEqual([t("2 * 3 * 4")]);
    expect(inline("**unclosed")).toEqual([t("**unclosed")]);
  });

  it("gives leftover delimiters back as literal text", () => {
    expect(inline("**foo*")).toEqual([t("*"), t("foo", "italic")]);
    expect(inline("*foo**")).toEqual([t("foo", "italic"), t("*")]);
  });

  it("allows asterisk emphasis inside a word", () => {
    expect(inline("a*b*c")).toEqual([t("a"), t("b", "italic"), t("c")]);
  });
});

describe("markdownToDocument: links", () => {
  it("parses links, titles, autolinks, and balanced parentheses in the URL", () => {
    expect(inline("[text](https://x.com)")).toEqual([link("text", "https://x.com")]);
    expect(inline('[text](https://x.com "Title")')).toEqual([link("text", "https://x.com")]);
    expect(inline("<https://x.com/a>")).toEqual([link("https://x.com/a", "https://x.com/a")]);
    expect(inline("[w](https://x.com/wiki/Foo_(bar))")).toEqual([link("w", "https://x.com/wiki/Foo_(bar)")]);
  });

  it("combines links with other formatting in either direction", () => {
    expect(inline("[**bold link**](https://x.com)")).toEqual([link("bold link", "https://x.com", "bold")]);
    expect(inline("**[link](https://x.com)**")).toEqual([link("link", "https://x.com", "bold")]);
  });

  it("leaves brackets that are not a link as text", () => {
    expect(inline("[not a link] (x)")).toEqual([t("[not a link] (x)")]);
    expect(inline("[a]()")).toEqual([t("a")]);
  });

  it("accepts http(s), mailto, tel, relative and anchor URLs", () => {
    for (const href of ["http://a.dev", "https://a.dev/p?q=1#h", "mailto:a@b.co", "tel:+123", "/rel/path", "../up.md", "#anchor"]) {
      expect(inline(`[x](${href})`)).toEqual([link("x", href)]);
    }
  });

  it.each([
    "javascript:alert(1)",
    "JaVaScRiPt:alert(1)",
    " javascript:alert(1)",
    "vbscript:msgbox(1)",
    "data:text/html;base64,AAAA",
    "file:///etc/passwd",
  ])("drops the link but keeps the text for %s", (href) => {
    expect(inline(`[click](<${href}>)`)).toEqual([t("click")]);
  });

  it("cannot be tricked by control characters inside the scheme", () => {
    expect(inline("[click](<java\tscript:alert(1)>)")).toEqual([t("click")]);
    expect(inline("[click](<java\u0000script:alert(1)>)")).toEqual([t("click")]);
  });

  it("does not autolink non-http schemes", () => {
    expect(inline("<javascript:alert(1)>")).toEqual([t("<javascript:alert(1)>")]);
  });

  it("never emits a link mark with an unsafe href, whatever the input", () => {
    const md = [
      "[a](javascript:alert(1)) [b](JAVASCRIPT:x) ![c](javascript:x) [d](<vbscript:x>)",
      "[![e](x.png)](javascript:alert(1))",
      "<javascript:alert(1)>",
    ].join("\n\n");
    for (const b of markdownToDocument(md).blocks) {
      for (const run of b.content ?? []) {
        for (const mark of run.marks) {
          if (mark.type === "link") expect(mark.href).not.toMatch(/^\s*(javascript|vbscript|data):/i);
        }
      }
    }
  });
});

describe("markdownToDocument: pathological input", () => {
  const cases: Array<[string, string]> = [
    ["many unmatched openers", "*a ".repeat(20000)],
    ["many unmatched brackets", "[".repeat(20000)],
    ["many broken links", "[a](".repeat(5000)],
    ["many backticks", "`".repeat(20000) + "x"],
    ["alternating mixed delimiters", "_a*".repeat(10000)],
    ["deeply nested images", "![".repeat(200) + "x" + "](y)".repeat(200)],
    ["deeply nested emphasis", "*a ".repeat(3000) + "b" + " a*".repeat(3000)],
    ["a huge list", "- item\n".repeat(20000)],
    ["deep list nesting", Array.from({ length: 500 }, (_, i) => `${" ".repeat(i)}- x`).join("\n")],
  ];

  it.each(cases)("finishes quickly on %s", (_name, input) => {
    const started = performance.now();
    const doc = markdownToDocument(input);
    expect(doc.version).toBe(1);
    expect(performance.now() - started).toBeLessThan(3000);
  });
});

describe("markdownToDocument: round-tripping documentToMarkdown", () => {
  const text = (value: string, ...marks: InlineMark[]): InlineContent => ({ type: "text", text: value, marks });

  const original: Block[] = [
    { id: "1", type: "heading", props: { level: 2 }, content: [text("Project plan")], children: [] },
    {
      id: "2",
      type: "paragraph",
      props: {},
      content: [
        text("Some "),
        text("bold", { type: "bold" }),
        text(", "),
        text("italic", { type: "italic" }),
        text(", "),
        text("struck", { type: "strikethrough" }),
        text(", "),
        text("under", { type: "underline" }),
        text(", "),
        text("code", { type: "code" }),
        text(" and "),
        text("a link", { type: "link", href: "https://example.com/x" }),
        text("."),
      ],
      children: [],
    },
    {
      id: "3",
      type: "bulletedListItem",
      props: {},
      content: [text("parent")],
      children: [
        { id: "3a", type: "bulletedListItem", props: {}, content: [text("child")], children: [] },
        { id: "3b", type: "numberedListItem", props: {}, content: [text("numbered child")], children: [] },
      ],
    },
    { id: "4", type: "numberedListItem", props: {}, content: [text("first")], children: [] },
    { id: "5", type: "numberedListItem", props: {}, content: [text("second")], children: [] },
    { id: "6", type: "todo", props: { checked: true }, content: [text("done")], children: [] },
    { id: "7", type: "todo", props: { checked: false }, content: [text("not yet")], children: [] },
    { id: "8", type: "quote", props: {}, content: [text("A quotation")], children: [] },
    { id: "9", type: "callout", props: { icon: "🔥", color: CALLOUT_COLOR }, content: [text("Heads up")], children: [] },
    { id: "10", type: "code", props: { language: "ts", code: "const a = 1;\n\n// # not a heading\nexport { a };" }, children: [] },
    { id: "11", type: "divider", props: {}, children: [] },
    { id: "12", type: "image", props: { src: "https://example.com/cat.png", alt: "a cat", caption: "My cat" }, children: [] },
    { id: "13", type: "paragraph", props: {}, content: [text("The end")], children: [] },
  ];

  it("reproduces a document with every built-in block type", () => {
    const markdown = documentToMarkdown({ version: 1, blocks: original });
    expect(markdownToDocument(markdown).blocks.map(plain)).toEqual(original.map((b) => plain(b)));
  });

  it("is stable: importing an export of an import changes nothing", () => {
    const messy = [
      "Intro paragraph",
      "with a wrapped line.",
      "",
      "Setext Title",
      "============",
      "",
      "* one",
      "* two",
      "    * nested",
      "",
      "1) first",
      "2) second",
      "",
      "> 💡 tip with **bold**",
      "",
      "> plain quote",
      "",
      "```sh",
      "npm install",
      "```",
      "",
      "![shot](shot.png)",
      "*Caption*",
    ].join("\n");
    const once = markdownToDocument(messy);
    const twice = markdownToDocument(documentToMarkdown(once));
    expect(twice.blocks.map(plain)).toEqual(once.blocks.map(plain));
  });
});
