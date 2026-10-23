import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures.ts";

const pageUrl = "http://example.test/article";

/** A German article whose first line holds the words the tests point at, followed by `rest`. */
function articleHtml({
  rootStyle = "",
  rest = "",
}: {
  rootStyle?: string;
  rest?: string;
}): string {
  return `<!doctype html>
<html lang="de" style="${rootStyle}">
  <head><meta charset="utf-8"></head>
  <body style="margin: 0; padding: 8px">
    <p style="font-size: 24px; margin-top: 280px">Der <span id="first">Hund</span> <span id="second">bellt</span> laut.</p>
    ${rest}
    <p id="elsewhere" style="margin-top: 400px">Ende</p>
    <div style="height: 2000px"></div>
  </body>
</html>`;
}

/** Serves the page with the headers and waits for the extension's content script to add its pop-up's host. */
async function openPage(
  page: Page,
  html: string,
  headers: Record<string, string> = {},
): Promise<void> {
  await page.route(pageUrl, (route) =>
    route.fulfill({
      contentType: "text/html; charset=utf-8",
      headers,
      body: html,
    }),
  );
  await page.goto(pageUrl);
  await page.locator("easyimmerse-lookup").waitFor({ state: "attached" });
}

/** Moves the mouse onto the middle of the element with the id while holding Shift. */
async function hoverWithShift(page: Page, id: string): Promise<void> {
  const box = await page.locator(`#${id}`).boundingBox();
  if (box === null) throw new Error(`#${id} is not on the page.`);
  await page.keyboard.down("Shift");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, {
    steps: 4,
  });
  await page.keyboard.up("Shift");
}

const popupOf = (page: Page) =>
  page.getByRole("dialog", { name: "Dictionary" });

/** Where the pop-up's top edge is, once it has finished gliding there. */
async function settledPopupTop(page: Page): Promise<number> {
  await expect(popupOf(page)).toBeVisible();
  let previous = Number.NaN;
  for (;;) {
    const top = (await popupOf(page).boundingBox())?.y ?? Number.NaN;
    if (top === previous) return top;
    previous = top;
    await page.waitForTimeout(100);
  }
}

test.describe("on an article", () => {
  test.beforeEach(async ({ page }) => {
    await openPage(page, articleHtml({}));
  });

  test("holding Shift over a word opens the pop-up with the server's answer for it", async ({
    page,
  }) => {
    await hoverWithShift(page, "first");
    await expect(popupOf(page)).toContainText("No entry for “Hund”.");
  });

  test("moving to another word while holding Shift shows that word", async ({
    page,
  }) => {
    await hoverWithShift(page, "first");
    await hoverWithShift(page, "second");
    await expect(popupOf(page)).toContainText("No entry for “bellt”.");
  });

  test("Escape closes the pop-up", async ({ page }) => {
    await hoverWithShift(page, "first");
    await expect(popupOf(page)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(popupOf(page)).toBeHidden();
  });

  test("a click outside the pop-up closes it", async ({ page }) => {
    await hoverWithShift(page, "first");
    await expect(popupOf(page)).toBeVisible();
    await page.locator("#elsewhere").click();
    await expect(popupOf(page)).toBeHidden();
  });

  test("the pop-up follows its word when the page scrolls", async ({
    page,
  }) => {
    await hoverWithShift(page, "first");
    const top = await settledPopupTop(page);
    await page.evaluate(() => window.scrollBy(0, 100));
    await expect.poll(() => settledPopupTop(page)).toBe(top - 100);
  });

  test("the pop-up closes once its word scrolls out of the window", async ({
    page,
  }) => {
    await hoverWithShift(page, "first");
    await expect(popupOf(page)).toBeVisible();
    await page.evaluate(() => window.scrollBy(0, 400));
    await expect(popupOf(page)).toBeHidden();
  });
});

test("the pop-up follows its word when a box on the page scrolls", async ({
  page,
}) => {
  // The box sits high in the window, so that the pop-up stays below the word as it scrolls.
  await openPage(
    page,
    `<!doctype html><html lang="de"><head><meta charset="utf-8"></head>
      <body><div id="box" style="height: 300px; margin-top: 100px; overflow: auto">
        <p style="font-size: 24px; margin-top: 100px">Die <span id="boxed">Katze</span> schläft.</p>
        <div style="height: 1000px"></div>
      </div></body></html>`,
  );
  await hoverWithShift(page, "boxed");
  const top = await settledPopupTop(page);
  await page.locator("#box").evaluate((box) => box.scrollBy(0, 50));
  await expect.poll(() => settledPopupTop(page)).toBe(top - 50);
});

test("holding Shift lets the pointer through the pop-up to a word it covers", async ({
  page,
}) => {
  await openPage(
    page,
    articleHtml({
      rest: '<p style="font-size: 24px; margin-top: 24px"><span id="covered">Katze</span> und Maus.</p>',
    }),
  );
  await hoverWithShift(page, "first");
  await expect(popupOf(page)).toContainText("No entry for “Hund”.");
  await hoverWithShift(page, "covered");
  await expect(popupOf(page)).toContainText("No entry for “Katze”.");
});

test("the pop-up keeps its size on a page with a small root font size", async ({
  page,
}) => {
  await openPage(page, articleHtml({ rootStyle: "font-size: 62.5%" }));
  await hoverWithShift(page, "first");
  await expect
    .poll(async () => (await popupOf(page).boundingBox())?.width)
    .toBe(512);
});

const japaneseHtml = `<!doctype html><html lang="ja"><head><meta charset="utf-8"></head>
  <body><p style="font-size: 32px; margin-top: 200px">この<span id="book">本</span>を読む。</p></body></html>`;

/** The sample dictionary's picture of 本, drawn once it has come through the background script after the entries. */
const bookPicture = (page: Page) =>
  popupOf(page).getByRole("img", { name: "a grey square" }).first();

test("the pop-up shows a dictionary's image, loaded through the extension", async ({
  page,
}) => {
  await openPage(page, japaneseHtml);
  await hoverWithShift(page, "book");
  await expect(bookPicture(page)).toBeVisible({ timeout: 10_000 });
});

test("the pop-up shows a dictionary's image on a page whose CSP allows images only from itself", async ({
  page,
}) => {
  await openPage(page, japaneseHtml, {
    "content-security-policy": "img-src 'self'",
  });
  await hoverWithShift(page, "book");
  await expect(bookPicture(page)).toBeVisible({ timeout: 10_000 });
});

/** A lookup answer for 鳥 whose definition holds a monochrome SVG glyph, which the pop-up paints in the text color, as Jitendex's glyphs are. */
const birdLookupResponse = {
  results: [
    {
      matchedText: "鳥",
      term: "鳥",
      reading: "とり",
      inflectionChains: [],
      definitions: [
        {
          dictionaryId: "glyphs",
          dictionaryTitle: "Glyphs",
          entry: {
            term: "鳥",
            reading: "とり",
            alternates: [],
            wordClasses: [],
            score: 1,
            sequence: 1,
            termTags: [],
            definitionTags: [],
            definitions: [
              {
                kind: "structured",
                content: [
                  "bird ",
                  {
                    tag: "img",
                    path: "glyphs/bird.svg",
                    width: 2,
                    height: 2,
                    sizeUnits: "em",
                    alt: "glyph",
                    appearance: "monochrome",
                    background: false,
                  },
                ],
              },
            ],
          },
          tags: [],
        },
      ],
      frequencies: [],
      pronunciations: [],
    },
  ],
  kanji: [],
  stylesheets: [],
};

const birdGlyph =
  '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>';

test("the pop-up paints a monochrome SVG glyph on a page whose CSP allows images only from itself", async ({
  context,
  page,
}) => {
  // The background script's requests to the server are answered here, since the sample dictionaries hold no such glyph.
  await context.route("**/dictionaries/lookup?**", (route) =>
    new URL(route.request().url()).searchParams.get("text")?.startsWith("鳥")
      ? route.fulfill({ json: birdLookupResponse })
      : route.continue(),
  );
  await context.route("**/dictionaries/glyphs/media/**", (route) =>
    route.fulfill({ contentType: "image/svg+xml", body: birdGlyph }),
  );
  await openPage(
    page,
    `<!doctype html><html lang="ja"><head><meta charset="utf-8"></head>
      <body><p style="font-size: 32px; margin-top: 200px">青い<span id="bird">鳥</span>が飛ぶ。</p></body></html>`,
    { "content-security-policy": "img-src 'self'" },
  );
  await hoverWithShift(page, "bird");
  const glyph = popupOf(page).getByRole("img", { name: "glyph" });
  await expect
    .poll(() => glyph.evaluate(centerAlphaOf), { timeout: 10_000 })
    .toBe(255);
});

/** The opacity of the pixel at the middle of a canvas, from 0 to 255. */
function centerAlphaOf(canvas: Element): number | undefined {
  if (!(canvas instanceof HTMLCanvasElement)) return undefined;
  const { width, height } = canvas;
  const pixel = canvas
    .getContext("2d")
    ?.getImageData(Math.floor(width / 2), Math.floor(height / 2), 1, 1).data;
  return pixel?.[3];
}
