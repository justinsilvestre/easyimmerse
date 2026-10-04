import path from "node:path";
import { expect, type Page, test } from "@playwright/test";

const fixtures = path.join(import.meta.dirname, "../../../fixtures");
// A WAV file plays in every Chromium build, and its seeks land exactly where asked.
const mediaFixture = path.join(fixtures, "conversion-tone.wav");
const subtitlesFixture = path.join(fixtures, "sample.srt");

async function chooseFile(page: Page, buttonName: string, file: string) {
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
  await chooseFile(page, "Add media", mediaFixture);
});

test("an added media file opens in the player", async ({ page }) => {
  const player = page.getByRole("region", { name: "Player" });
  await expect(player.getByLabel("Audio")).toBeAttached();
});

test("an added subtitles file lists its cues", async ({ page }) => {
  await chooseFile(page, "Add a file", subtitlesFixture);
  const subtitles = page.getByRole("list", { name: "Subtitles" });
  await expect(subtitles).toContainText("The cat is sleeping.");
});

test("clicking a cue's time seeks the player to its start", async ({
  page,
}) => {
  await chooseFile(page, "Add a file", subtitlesFixture);
  await page.getByRole("button", { name: "Play from 0:01" }).click();
  // A seek lands half a frame after the cue's start, so the position is a little past 1750 ms.
  await expect(
    page.getByRole("slider", { name: "Position", exact: true }),
  ).toHaveValue(/^17[5-6]\d/);
});
