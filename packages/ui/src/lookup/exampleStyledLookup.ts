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
  inflections: [],
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
  inflections: [],
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

/** The stylesheets that the Yomitan and MDict fixtures ship. */
export const exampleStylesheets: DictionaryStylesheet[] = [
  { dictionaryId: "sample-yomitan", css: yomitanCss },
  { dictionaryId: "sample-mdict", css: mdictCss },
];
