import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, type Page, test } from "@playwright/test";

const mediaFixture = path.join(
  import.meta.dirname,
  "../../../fixtures/conversion-tone.wav",
);

// 𠮷 lies outside the Basic Multilingual Plane, so the lookup's offset, counted in characters,
// differs from the clicked character's index in a JavaScript string.
const japaneseSubtitles = Buffer.from(
  "1\n00:00:00,500 --> 00:00:03,000\n𠮷野家で映画を見る\n",
);

/** A dictionary that states no language, which the app counts as covering every language, so that lookups are sent. */
const dictionaryForAnyLanguage = {
  id: "any",
  title: "Any",
  format: "csv",
  source_language: null,
  target_language: null,
  entry_count: 1,
  term_meta_count: 0,
  tag_count: 0,
  kanji_count: 0,
  kanji_meta_count: 0,
  media_count: 0,
};

/**
 * Opens the media screen on the subtitles above, in a media file of its own.
 * The tests share one server, and a file with the name of one already in the project opens that one instead,
 * with the subtitles another test gave it; so each run of a test adds the media under a name of its own.
 * Batch lookups fail unless `answersBatches` says otherwise, so that every word is looked up on its own,
 * which the tests that wait for a word's lookup request rely on, and the server's own dictionaries never answer.
 */
async function openJapaneseSubtitles(page: Page, answersBatches = false) {
  await page.route("**/dictionaries", (route) =>
    route.request().method() === "GET"
      ? route.fulfill({ json: { dictionaries: [dictionaryForAnyLanguage] } })
      : route.fallback(),
  );
  await page.route("**/dictionaries/lookup/batch", (route) =>
    answersBatches
      ? route.fulfill({ json: answerBatch(route.request().postDataJSON()) })
      : route.fulfill({ status: 404, json: { message: "Not found" } }),
  );
  await page.goto("/");
  await page
    .getByRole("list", { name: "Projects" })
    .getByRole("button")
    .first()
    .click();
  const mediaChooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Add media" }).first().click();
  await (await mediaChooser).setFiles({
    name: `japanese-${randomUUID()}.wav`,
    mimeType: "audio/wav",
    buffer: readFileSync(mediaFixture),
  });
  await expect(page.getByRole("region", { name: "Player" })).toBeVisible();
  const subtitlesChooser = page.waitForEvent("filechooser");
  // The empty panel's button is the one shown on every layout; on a phone the track bar's is folded away.
  await page
    .getByRole("button", { name: /^Add a (subtitles )?file$/ })
    .first()
    .click();
  await (await subtitlesChooser).setFiles({
    name: "japanese.srt",
    mimeType: "text/plain",
    buffer: japaneseSubtitles,
  });
}

test("a later character of a Japanese run is looked up from that character", async ({
  page,
}, testInfo) => {
  await openJapaneseSubtitles(page);
  const run = page
    .getByRole("list", { name: "Subtitles" })
    .getByRole("button", { name: "𠮷野家で映画を見る" });
  // The middle of 見, the seventh character after 𠮷, relative to the run's button.
  // The run's text may be split across several text nodes, so the node holding 見 is searched for.
  const position = await run.evaluate((element) => {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    let text = walker.nextNode() as Text | null;
    while (text && !text.data.includes("見"))
      text = walker.nextNode() as Text | null;
    if (!text) throw new Error("The run does not contain 見.");
    const index = text.data.indexOf("見");
    const range = document.createRange();
    range.setStart(text, index);
    range.setEnd(text, index + 1);
    const character = range.getBoundingClientRect();
    const button = element.getBoundingClientRect();
    return {
      x: character.left + character.width / 2 - button.left,
      y: character.top + character.height / 2 - button.top,
    };
  });
  const lookup = page.waitForRequest((request) =>
    request.url().includes("/dictionaries/lookup"),
  );
  if (testInfo.project.use.hasTouch) await run.tap({ position });
  else await run.click({ position });
  const query = new URL((await lookup).url()).searchParams;
  expect([query.get("text"), query.get("offset")]).toEqual(["見る", "7"]);
});

/** The words a dictionary would find in 𠮷野家で映画を見る, by the text a lookup starts from. */
const japaneseWords = ["𠮷野家", "で", "映画", "を", "見る"];

/** The result for a word of `japaneseWords`. */
function resultFor(word: string) {
  return {
    matchedText: word,
    term: word,
    reading: null,
    inflectionChains: [],
    definitions: [],
    frequencies: [],
    pronunciations: [],
  };
}

/** The word of `japaneseWords` that a text starts with, if any. */
const wordStarting = (text: string) =>
  japaneseWords.find((each) => text.startsWith(each));

/** Answers each single lookup with the word the text starts with, so that the run's words are known. */
async function answerLookupsWithWords(page: Page) {
  const isSingleLookup = (url: URL) =>
    url.pathname.endsWith("/dictionaries/lookup");
  await page.route(isSingleLookup, (route) => {
    const text = new URL(route.request().url()).searchParams.get("text") ?? "";
    const word = wordStarting(text);
    const results = word ? [resultFor(word)] : [];
    return route.fulfill({ json: { results, kanji: [], stylesheets: [] } });
  });
}

/** Answers a batch lookup as `answerLookupsWithWords` answers single lookups, at every character of every text. */
function answerBatch({ texts }: { texts: string[] }) {
  return {
    texts: texts.map((text) => ({
      positions: [...text].flatMap((_, offset) => {
        const index = japaneseWords.indexOf(
          wordStarting([...text].slice(offset).join("")) ?? "",
        );
        return index < 0 ? [] : [{ offset, results: [index], kanji: [] }];
      }),
    })),
    results: japaneseWords.map(resultFor),
    kanji: [],
    stylesheets: [],
  };
}

/** Focuses the Japanese run and waits until the lookup from its first character has answered with 𠮷野家. */
async function focusJapaneseRun(page: Page) {
  await answerLookupsWithWords(page);
  await openJapaneseSubtitles(page);
  const run = page
    .getByRole("list", { name: "Subtitles" })
    .getByRole("button", { name: "𠮷野家で映画を見る" });
  await run.focus();
  await expect(run.locator("[data-hovered]")).toHaveText("𠮷野家");
  return run;
}

test("a run whose lookups were fetched ahead is highlighted without a lookup of its own", async ({
  page,
  hasTouch,
}) => {
  test.skip(hasTouch, "Keyboard lookups need a keyboard.");
  const singleLookups: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.endsWith("/dictionaries/lookup"))
      singleLookups.push(request.url());
  });
  const batch = page.waitForResponse((response) =>
    response.url().includes("/dictionaries/lookup/batch"),
  );
  await openJapaneseSubtitles(page, true);
  await batch;
  const run = page
    .getByRole("list", { name: "Subtitles" })
    .getByRole("button", { name: "𠮷野家で映画を見る" });
  await run.focus();
  await run
    .locator("[data-hovered]", { hasText: "𠮷野家" })
    .waitFor({ state: "visible" });
  expect(singleLookups).toEqual([]);
});

/** Presses a key and resolves to the text and offset of the lookup it sends. */
async function lookupAfterPressing(page: Page, key: string) {
  const lookup = page.waitForRequest((request) =>
    request.url().includes("/dictionaries/lookup"),
  );
  await page.keyboard.press(key);
  const query = new URL((await lookup).url()).searchParams;
  return [query.get("text"), query.get("offset")];
}

test.describe("with the keyboard in a Japanese run", () => {
  test.skip(({ hasTouch }) => hasTouch, "Keyboard lookups need a keyboard.");

  test("Right moves the lookup past the characters the lookup matched", async ({
    page,
  }) => {
    await focusJapaneseRun(page);
    expect(await lookupAfterPressing(page, "ArrowRight")).toEqual([
      "で映画を見る",
      "3",
    ]);
  });

  test("Shift+Right moves the lookup one character", async ({ page }) => {
    await focusJapaneseRun(page);
    expect(await lookupAfterPressing(page, "Shift+ArrowRight")).toEqual([
      "野家で映画を見る",
      "1",
    ]);
  });

  test("Left moves the lookup back to the start of the word before it", async ({
    page,
  }) => {
    const run = await focusJapaneseRun(page);
    for (const word of ["で", "映画", "を"]) {
      await page.keyboard.press("ArrowRight");
      await expect(run.locator("[data-hovered]")).toHaveText(word);
    }
    await page.keyboard.press("ArrowLeft");
    await expect(run.locator("[data-hovered]")).toHaveText("映画");
  });
});
