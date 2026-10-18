import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, type Page, test } from "@playwright/test";

const bookFixture = path.join(
  import.meta.dirname,
  "../../../fixtures/sample.epub",
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

/** The result for a word, which the dictionary finds as it was written. */
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

/**
 * Answers every lookup with the first word of the text it was sent, which runs from the word under the cursor to the end of its sentence.
 * Batch lookups fail, so that every word is looked up on its own, and the server's own dictionaries never answer.
 */
async function answerLookupsWithWords(page: Page) {
  await page.route("**/dictionaries", (route) =>
    route.request().method() === "GET"
      ? route.fulfill({ json: { dictionaries: [dictionaryForAnyLanguage] } })
      : route.fallback(),
  );
  await page.route("**/dictionaries/lookup/batch", (route) =>
    route.fulfill({ status: 404, json: { message: "Not found" } }),
  );
  const isSingleLookup = (url: URL) =>
    url.pathname.endsWith("/dictionaries/lookup");
  await page.route(isSingleLookup, (route) => {
    const text = new URL(route.request().url()).searchParams.get("text");
    const word = text && /^[\p{L}\p{M}\p{N}'’-]+/u.exec(text)?.[0];
    const results = word ? [resultFor(word)] : [];
    return route.fulfill({ json: { results, kanji: [], stylesheets: [] } });
  });
}

/**
 * Opens the sample book in the reader, in a media file of its own.
 * The tests share one server, and a file with the name of one already in the project opens that one instead,
 * so each run of a test adds the book under a name of its own; adding it opens it at once.
 */
async function openSampleBook(page: Page) {
  await answerLookupsWithWords(page);
  await page.goto("/");
  await page
    .getByRole("list", { name: "Projects" })
    .getByRole("button")
    .first()
    .click();
  const mediaChooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Add media" }).first().click();
  await (await mediaChooser).setFiles({
    name: `reader-${randomUUID()}.epub`,
    mimeType: "application/epub+zip",
    buffer: readFileSync(bookFixture),
  });
  return page.getByRole("main", { name: "Text" });
}

/** The text of the word the reader highlights, which it draws as a CSS custom highlight rather than an element. */
function highlightedWord(page: Page) {
  return page.evaluate(() =>
    [...(CSS.highlights.get("reader-word") ?? [])]
      .map((range) => (range instanceof Range ? range.toString() : ""))
      .join(""),
  );
}

/** Focuses the book's text and waits until the cursor's lookup has answered and highlighted the page's first word. */
async function focusText(page: Page) {
  const text = await openSampleBook(page);
  await expect(text.getByText("The cat is sleeping")).toBeVisible();
  // A focus the pointer did not cause counts as reaching the text from the keyboard.
  await text.focus();
  await expect.poll(() => highlightedWord(page)).toBe("The");
}

/** Presses a key and waits until the cursor's highlight has moved to the word. */
async function pressToReach(page: Page, key: string, word: string) {
  await page.keyboard.press(key);
  await expect.poll(() => highlightedWord(page)).toBe(word);
}

function wordToLookUp(page: Page) {
  return page
    .getByRole("dialog", { name: "Dictionary" })
    .getByRole("textbox", { name: "Word to look up" });
}

test.describe("the reader's keyboard cursor", () => {
  test("is looked up with L on the first word of the page once the text gains focus", async ({
    page,
  }) => {
    await focusText(page);
    await page.keyboard.press("l");
    await expect(wordToLookUp(page)).toHaveValue("The");
  });

  test("is looked up with Enter on the word the arrow keys moved it to", async ({
    page,
  }) => {
    await focusText(page);
    for (const word of ["cat", "is", "sleeping"])
      await pressToReach(page, "ArrowRight", word);
    await page.keyboard.press("Enter");
    await expect(wordToLookUp(page)).toHaveValue("sleeping");
  });

  test("moves to the next sentence with Down", async ({ page }) => {
    await focusText(page);
    await pressToReach(page, "ArrowRight", "cat");
    await pressToReach(page, "ArrowDown", "The");
    // Both sentences start with "The"; the word after it tells which one the cursor is in.
    await page.keyboard.press("ArrowRight");
    await expect.poll(() => highlightedWord(page)).toBe("dog");
  });

  test("leaves Right to turn the page once a second Escape takes it away", async ({
    page,
  }) => {
    await focusText(page);
    await page.keyboard.press("l");
    const popup = page.getByRole("dialog", { name: "Dictionary" });
    await expect(popup).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(popup).toBeHidden();
    await page.keyboard.press("Escape");
    await page.keyboard.press("ArrowRight");
    await expect(
      page.getByRole("heading", { level: 2, name: "Chapter Two" }),
    ).toBeVisible();
  });
});
