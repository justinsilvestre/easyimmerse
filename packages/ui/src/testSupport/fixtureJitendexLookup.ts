import type {
  DictionaryLookupResult,
  DictionarySummary,
  StructuredContent,
  StructuredContentElement,
  TermEntry,
} from "@easyimmerse/types";

export const fixtureJitendexDictionary: DictionarySummary = {
  id: "d4",
  title: "Jitendex-like Dictionary",
  entry_count: 1,
  source_language: "ja",
  target_language: "en",
};

/** A stylesheet written the way Jitendex writes its own, selecting on `data-sc-*` attributes and nesting rules. */
export const fixtureJitendexStylesheet = `
span[title] { cursor: help; }
ul[data-sc-content="sense-groups"] { list-style-type: "＊"; }
li[data-sc-content="sense"] {
  padding-left: 0.25em;
  & ul[data-sc-content="glossary"] { list-style-type: none; padding-left: 0; }
}
span[data-sc-class="tag"] {
  border-radius: 0.3em;
  font-size: 0.8em;
  font-weight: bold;
  margin-right: 0.5em;
  padding: 0.2em 0.3em;
}
span[data-sc-content="part-of-speech-info"] { background-color: #565656; color: white; }
span[data-sc-content="misc-info"] { background-color: brown; color: white; }
div[data-sc-class="extra-box"] {
  border-style: none none none solid;
  border-width: 3px;
  border-radius: 0.4rem;
  margin: 0.5rem 0;
  padding: 0.5rem;
  width: fit-content;
}
div[data-sc-content="xref"] {
  border-color: #1a73e8;
  background-color: color-mix(in srgb, #1a73e8 5%, transparent);
  & span[data-sc-content="reference-label"] { color: #1a73e8; font-size: 0.8em; margin-right: 0.5rem; }
}
div[data-sc-content="example-sentence"] { border-color: #333; }
table[data-sc-content="forms"] td { text-align: center; }
div[data-sc-content="attribution"] { font-size: 0.7em; text-align: right; }
`;

const tag = (
  content: string,
  kind: string,
  title: string,
): StructuredContentElement => ({
  tag: "span",
  title,
  data: { class: "tag", content: kind },
  content,
});

const ruby = (base: string, reading: string): StructuredContentElement => ({
  tag: "ruby",
  content: [base, { tag: "rt", content: reading }],
});

const sense = (
  glosses: string[],
  extra: StructuredContent[] = [],
): StructuredContentElement => ({
  tag: "li",
  data: { content: "sense" },
  content: [
    {
      tag: "ul",
      data: { content: "glossary" },
      content: glosses.map((gloss) => ({ tag: "li", content: gloss })),
    },
    ...extra,
  ],
});

const exampleSentence: StructuredContent = {
  tag: "div",
  data: { class: "extra-box", content: "example-sentence" },
  content: [
    {
      tag: "div",
      lang: "ja",
      content: [ruby("猫", "ねこ"), "が", ruby("好", "す"), "きです。"],
    },
    { tag: "div", lang: "en", content: "I like cats." },
  ],
};

const crossReference: StructuredContent = {
  tag: "div",
  data: { class: "extra-box", content: "xref" },
  content: [
    {
      tag: "span",
      data: { content: "reference-label" },
      content: "See also",
    },
    {
      tag: "a",
      lang: "ja",
      href: "?query=%E8%8A%B8%E8%80%85&wildcards=off&primary_reading=%E3%81%92%E3%81%84%E3%81%97%E3%82%83",
      content: [ruby("芸", "げい"), ruby("者", "しゃ")],
    },
  ],
};

const formsTable: StructuredContent = {
  tag: "table",
  data: { content: "forms" },
  content: [
    {
      tag: "tr",
      content: [
        { tag: "th", content: "" },
        { tag: "th", content: "ねこ" },
      ],
    },
    {
      tag: "tr",
      content: [
        { tag: "th", content: "猫" },
        { tag: "td", content: "◎" },
      ],
    },
    {
      tag: "tr",
      content: [
        { tag: "th", content: "ネコ" },
        { tag: "td", content: "◯" },
      ],
    },
  ],
};

/** An entry shaped like Jitendex's: nested lists of senses, tags, ruby, a cross-reference, a forms table, and an image. */
export const fixtureJitendexEntry: TermEntry = {
  term: "猫",
  reading: "ねこ",
  definitions: [
    {
      type: "structured-content",
      content: [
        {
          tag: "ul",
          data: { content: "sense-groups" },
          content: [
            {
              tag: "li",
              data: { content: "sense-group" },
              content: [
                tag("noun", "part-of-speech-info", "noun (common)"),
                {
                  tag: "ol",
                  content: [
                    sense(
                      ["cat (esp. the domestic cat, Felis catus)"],
                      [exampleSentence],
                    ),
                    sense(["shamisen"]),
                    sense(["geisha"], [crossReference]),
                  ],
                },
              ],
            },
            {
              tag: "li",
              data: { content: "sense-group" },
              content: [
                tag("abbr", "misc-info", "abbreviation"),
                { tag: "ol", content: [sense(["wheelbarrow"])] },
              ],
            },
          ],
        },
        formsTable,
        {
          tag: "img",
          path: "img/cat.svg",
          width: 3,
          height: 3,
          sizeUnits: "em",
          title: "A cat",
          alt: "A cat's outline",
        },
        {
          tag: "div",
          data: { content: "attribution" },
          content: {
            tag: "a",
            href: "https://www.edrdg.org/jmwsgi/entr.py?svc=jmdict&q=1467640",
            content: "JMdict",
          },
        },
      ],
    },
  ],
  tags: [],
};

export const fixtureJitendexLookupResult: DictionaryLookupResult = {
  dictionary: fixtureJitendexDictionary,
  entries: [fixtureJitendexEntry],
};
