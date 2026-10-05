import path from "node:path";
import { expect, type Page, test } from "@playwright/test";

const fixturesDir = path.join(import.meta.dirname, "../../../fixtures");
// A WAV file plays in every Chromium build, and its seeks land exactly where asked.
const mediaFixture = path.join(fixturesDir, "conversion-tone.wav");
const subtitlesFixture = path.join(fixturesDir, "sample.srt");

async function pickFile(page: Page, buttonName: string, file: string) {
  const fileChooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: buttonName }).first().click();
  await (await fileChooser).setFiles(file);
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page
    .getByRole("list", { name: "Projects" })
    .getByRole("button")
    .first()
    .click();
  await pickFile(page, "Add media", mediaFixture);
  await expect(page.getByRole("region", { name: "Player" })).toBeVisible();
  await pickFile(page, "Add a subtitles file", subtitlesFixture);
});

test("a picked subtitles file shows its cues beside the player", async ({
  page,
}) => {
  const subtitles = page.getByRole("list", { name: "Subtitles" });
  await expect(subtitles).toContainText("The cat is sleeping.");
});

test("clicking a cue's time seeks the player to its start", async ({
  page,
}) => {
  await page
    .getByRole("list", { name: "Subtitles" })
    .getByRole("button", { name: "Play from 0:01" })
    .click();
  await expect(
    page.getByRole("slider", { name: "Position", exact: true }),
  ).toHaveValue(/^175/);
});

test("a word clicked in the subtitles opens the dictionary pop-up", async ({
  page,
}) => {
  await page
    .getByRole("list", { name: "Subtitles" })
    .getByRole("button", { name: "cat" })
    .click();
  await expect(page.getByRole("dialog", { name: "Dictionary" })).toBeVisible();
});

test("clicking the word the pop-up shows closes it", async ({ page }) => {
  const word = page
    .getByRole("list", { name: "Subtitles" })
    .getByRole("button", { name: "cat" });
  await word.click();
  const popup = page.getByRole("dialog", { name: "Dictionary" });
  await expect(popup).toBeVisible();
  await word.click();
  await expect(popup).toBeHidden();
});

test("a word double-clicked in the subtitles opens the flashcard editor in place of the pop-up", async ({
  page,
}) => {
  await page
    .getByRole("list", { name: "Subtitles" })
    .getByRole("button", { name: "cat" })
    .dblclick();
  await expect(page.getByRole("form", { name: "Flashcard" })).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Dictionary" })).toBeHidden();
});

test("a word double-clicked in the subtitles becomes a saved flashcard", async ({
  page,
}) => {
  await page
    .getByRole("list", { name: "Subtitles" })
    .getByRole("button", { name: "cat" })
    .dblclick();
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Flashcard saved to the project.")).toBeVisible();
});
