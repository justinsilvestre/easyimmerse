import { expect, test } from "@playwright/test";
import { addMediaWithSubtitles, createProject } from "./projectSteps.ts";

test.beforeEach(async ({ page }) => {
  await createProject(page, "Media spec", { target: "en", translation: "de" });
  await addMediaWithSubtitles(page, "sample.mp4");
});

test("the media screen shows a player and one card per cue", async ({
  page,
}) => {
  await expect(page.getByRole("region", { name: "Player" })).toBeVisible();
  const cues = page.getByRole("list", { name: "Subtitles" });
  await expect(cues.getByRole("listitem")).toHaveCount(4);
});

test("clicking a cue seeks the player to its start time", async ({ page }) => {
  const subtitles = page.getByRole("list", { name: "Subtitles" });
  await subtitles.getByRole("listitem").nth(1).getByRole("button").click();
  await expect(page.getByText("0:01 / 0:05")).toBeVisible();
});

test("the overlay shows the cue at the player's time", async ({ page }) => {
  const subtitles = page.getByRole("list", { name: "Subtitles" });
  await subtitles.getByRole("listitem").nth(1).getByRole("button").click();
  await expect(
    page.getByRole("region", { name: "Overlaid subtitles" }),
  ).toContainText("The dog wants to eat.");
});
