import path from "node:path";
import { expect, test } from "@playwright/test";

// A WAV file plays in every Chromium build, and its seeks land exactly where asked.
const mediaFixture = path.join(
  import.meta.dirname,
  "../../../fixtures/conversion-tone.wav",
);

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page
    .getByRole("list", { name: "Projects" })
    .getByRole("button")
    .first()
    .click();
});

test("the media screen shows the cues of the fixture subtitles", async ({
  page,
}) => {
  const subtitles = page.getByRole("list", { name: "Subtitles" });
  await expect(subtitles).toContainText("The cat is sleeping.");
});

test("clicking a cue seeks the player to its start time", async ({ page }) => {
  const fileChooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Add media" }).click();
  await (await fileChooser).setFiles(mediaFixture);
  const player = page.getByRole("region", { name: "Player" });
  await expect(player.getByLabel("Audio")).toBeVisible();
  await page
    .getByRole("list", { name: "Subtitles" })
    .getByRole("listitem")
    .nth(1)
    .getByRole("button")
    .first()
    .click();
  await expect(player).toContainText("0:01.8");
});
