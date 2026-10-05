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

async function openJapaneseSubtitles(page: Page) {
  await page.route("**/dictionaries", (route) =>
    route.request().method() === "GET"
      ? route.fulfill({ json: { dictionaries: [dictionaryForAnyLanguage] } })
      : route.fallback(),
  );
  await page.goto("/");
  await page
    .getByRole("list", { name: "Projects" })
    .getByRole("button")
    .first()
    .click();
  const mediaChooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Add media" }).first().click();
  await (await mediaChooser).setFiles(mediaFixture);
  await expect(page.getByRole("region", { name: "Player" })).toBeVisible();
  const subtitlesChooser = page.waitForEvent("filechooser");
  await page
    .getByRole("button", { name: "Add a subtitles file" })
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
  const position = await run.evaluate((element) => {
    const text = element.firstChild as Text;
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

test("Right moves a keyboard lookup to a later character of a Japanese run", async ({
  page,
}, testInfo) => {
  test.skip(
    !!testInfo.project.use.hasTouch,
    "Keyboard lookups need a keyboard.",
  );
  await openJapaneseSubtitles(page);
  const run = page
    .getByRole("list", { name: "Subtitles" })
    .getByRole("button", { name: "𠮷野家で映画を見る" });
  await run.focus();
  for (let step = 0; step < 7; step += 1)
    await page.keyboard.press("ArrowRight");
  const lookup = page.waitForRequest((request) =>
    request.url().includes("/dictionaries/lookup"),
  );
  await page.keyboard.press("Enter");
  const query = new URL((await lookup).url()).searchParams;
  expect([query.get("text"), query.get("offset")]).toEqual(["見る", "7"]);
});
