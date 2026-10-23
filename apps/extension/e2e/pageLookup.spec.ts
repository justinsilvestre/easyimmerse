import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures.ts";

const pageUrl = "http://example.test/article";
const articleHtml = `<!doctype html>
<html lang="de">
  <body>
    <p style="font-size: 24px">Der <span id="first">Hund</span> <span id="second">bellt</span> laut.</p>
    <p id="elsewhere" style="margin-top: 400px">Ende</p>
  </body>
</html>`;

test.beforeEach(async ({ context, page }) => {
  await context.route(pageUrl, (route) =>
    route.fulfill({ contentType: "text/html", body: articleHtml }),
  );
  await page.goto(pageUrl);
  await page.locator("easyimmerse-lookup").waitFor({ state: "attached" });
});

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
