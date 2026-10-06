import mdictCss from "@easyimmerse/fixtures/sample-mdict/sample.css?raw";
import yomitanCss from "@easyimmerse/fixtures/sample-yomitan/styles.css?raw";
import type {
  DictionaryStylesheet,
  LookupResult,
  StructuredContent,
} from "@easyimmerse/types";
import { exampleTermEntry } from "./exampleTermEntry.ts";

/** The structured content of 本 in the Yomitan fixture, whose glossary list its stylesheet marks with squares. */
const honContent: StructuredContent = [
  {
    tag: "ruby",
    content: [
      "本",
      { tag: "rp", content: "(" },
      { tag: "rt", content: "ほん" },
      { tag: "rp", content: ")" },
    ],
  },
  {
    tag: "ul",
    data: { content: "glossary" },
    content: [
      { tag: "li", content: "book" },
      { tag: "li", style: { fontStyle: "italic" }, content: "volume" },
    ],
  },
  { tag: "a", href: "?query=%E6%9B%B8%E7%B1%8D", content: "see 書籍" },
];

/** The entry for 本 from the Yomitan fixture. */
export const exampleStyledYomitanResult: LookupResult = {
  matchedText: "本",
  term: "本",
  reading: "ほん",
  inflectionChains: [],
  definitions: [
    {
      dictionaryId: "sample-yomitan",
      dictionaryTitle: "Sample Dictionary",
      entry: exampleTermEntry({
        term: "本",
        reading: "ほん",
        definitions: [{ kind: "structured", content: honContent }],
      }),
      tags: [],
    },
  ],
  frequencies: [],
  pronunciations: [],
};

/** The entry for cat from the MDict fixture, with its numbered style markers expanded as import expands them. */
export const exampleStyledMDictResult: LookupResult = {
  matchedText: "cat",
  term: "cat",
  reading: null,
  inflectionChains: [],
  definitions: [
    {
      dictionaryId: "sample-mdict",
      dictionaryTitle: "Sample MDict",
      entry: exampleTermEntry({
        term: "cat",
        definitions: [
          {
            kind: "html",
            html: '<b class="headword">cat</b><i>a small domesticated feline. See also <a href="entry://dog">dog</a>.<br><img src="cat.png"></i>',
          },
        ],
      }),
      tags: [],
    },
  ],
  frequencies: [],
  pronunciations: [],
};

/** An entry written in semantic HTML, with a link from its first sense to its second. */
export const exampleSemanticHtmlResult: LookupResult = {
  matchedText: "book",
  term: "book",
  reading: null,
  inflectionChains: [],
  definitions: [
    {
      dictionaryId: "example-semantic",
      dictionaryTitle: "Example Semantic HTML",
      entry: exampleTermEntry({
        term: "book",
        definitions: [
          {
            kind: "html",
            html: [
              '<header><h1>book</h1> <abbr title="noun">n.</abbr></header>',
              '<section id="sense-1"><h2>1</h2> <p><strong>A written work</strong> bound in covers; see also <a href="#sense-2">sense 2</a>.</p></section>',
              '<section id="sense-2"><h2>2</h2> <p>One of the parts of a long work, as in <q>the third <em>book</em> of the epic</q>.</p></section>',
            ].join(""),
          },
        ],
      }),
      tags: [],
    },
  ],
  frequencies: [],
  pronunciations: [],
};

/** A stylesheet that selects the semantic entry's tags and ids. */
const semanticHtmlCss = `
header { display: flex; gap: 0.5em; align-items: baseline; }
h1 { font-size: 1.4em; color: #1565c0; }
abbr { color: #888; }
h2 { display: inline; font-size: 1em; color: #888; }
section > p { display: inline; }
#sense-2 { background-color: #fff8e1; }
q { font-style: italic; }
`;

/** The stylesheets that the Yomitan and MDict fixtures ship, and the semantic entry's stylesheet. */
export const exampleStylesheets: DictionaryStylesheet[] = [
  { dictionaryId: "sample-yomitan", css: yomitanCss },
  { dictionaryId: "sample-mdict", css: mdictCss },
  { dictionaryId: "example-semantic", css: semanticHtmlCss },
];
