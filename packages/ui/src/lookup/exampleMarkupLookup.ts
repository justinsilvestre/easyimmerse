import type { LookupResult } from "@easyimmerse/types";
import { exampleTermEntry } from "./exampleTermEntry.ts";

function markupResult(
  term: string,
  dictionaryTitle: string,
  definition: LookupResult["definitions"][number]["entry"]["definitions"][number],
): LookupResult {
  return {
    matchedText: term,
    term,
    reading: null,
    inflections: [],
    definitions: [
      {
        dictionaryId: dictionaryTitle.toLowerCase().replaceAll(" ", "-"),
        dictionaryTitle,
        entry: exampleTermEntry({ term, definitions: [definition] }),
        tags: [],
      },
    ],
    frequencies: [],
    pronunciations: [],
  };
}

/** A StarDict HTML entry, with a link to another headword, an image from the dictionary's resources, and markup the display drops. */
export const exampleStarDictHtmlResult = markupResult(
  "blossom",
  "StarDict English",
  {
    kind: "html",
    html: `<b>blossom</b> <i>noun</i>
<ol>
  <li>A flower, especially one on a fruit tree. <img src="res/flower.png" alt="flower" width="20" height="20"></li>
  <li onclick="alert('hi')">The state of flowering: <span style="color: #2e7d32; background-image: url(https://example.com/pixel.gif)">in full blossom</span>.</li>
</ol>
<p>See also <a href="bword://bloom">bloom</a>.</p>
<script>alert("never runs")</script>`,
  },
);

/** A StarDict entry in Pango markup, as older Russian and Chinese dictionaries use. */
export const examplePangoResult = markupResult("книга", "Mueller Russian", {
  kind: "markup",
  dialect: "pango",
  markup: `<span foreground="#1565c0" weight="bold">кни́га</span> <i>ж.</i>
<b>1.</b> book
<b>2.</b> <span size="small" style="italic">(учёта)</span> register, ledger
<tt>книга жалоб</tt> — complaints book`,
});

/** A StarDict entry in XDXF markup, with a transcription, labels, examples and a cross-reference. */
export const exampleXdxfResult = markupResult("house", "XDXF English-Russian", {
  kind: "markup",
  dialect: "xdxf",
  markup: `<k>house</k>
<tr>haʊs</tr> <abr>n</abr>
<def><b>1.</b> <dtrn>дом</dtrn>, <dtrn>здание</dtrn>
<ex>a house in the country — дом в деревне</ex></def>
<def><b>2.</b> <co>(theatre)</co> <dtrn>зрительный зал</dtrn></def>
<c c="gray">See also</c> <kref>home</kref>`,
});

/** An MDict HTML entry, with links to other entries, a pronunciation, and resources referenced by absolute and remote paths. */
export const exampleMDictResult = markupResult("apple", "MDict Learner's", {
  kind: "html",
  html: `<html><head><link rel="stylesheet" href="learner.css"><script src="toggle.js"></script></head>
<body><div class="entry">
  <span class="hw">ap·ple</span> <span class="pos" style="font-style: italic">noun</span>
  <a href="sound://us/apple.mp3"><img src="speaker.png" alt="play"></a>
  <div class="sense"><span class="num">1</span> a round <a href="entry://fruit">fruit</a> with red, yellow or green skin
    <img src="/images/apple.png" alt="an apple" width="32" height="32">
  </div>
  <div class="sense"><span class="num">2</span> <font color="#8e24aa">the Big Apple</font>: New York City</div>
  <table><tr><th>plural</th><td>apples</td></tr></table>
  <img src="https://tracker.example.com/pixel.gif" alt="">
  <p><a href="https://en.wikipedia.org/wiki/Apple">More on Wikipedia</a></p>
</div></body></html>`,
});
