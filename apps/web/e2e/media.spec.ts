import { expect, test } from "@playwright/test";

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
  const subtitles = page.getByRole("list", { name: "Subtitles" });
  await subtitles
    .getByRole("listitem")
    .nth(1)
    .getByRole("button")
    .first()
    .click();
  await expect(page.getByRole("region", { name: "Player" })).toHaveText(
    "0:01.8",
  );
});
