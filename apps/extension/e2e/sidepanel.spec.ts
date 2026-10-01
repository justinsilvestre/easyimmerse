import { fixturePath } from "@easyimmerse/fixtures";
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures.ts";

test.beforeEach(async ({ page, extensionId }) => {
  await page.goto(`chrome-extension://${extensionId}/sidepanel.html`);
});

test("the side panel lists the two placeholder projects", async ({ page }) => {
  const projects = page.getByRole("list", { name: "Projects" });
  await expect(projects.getByRole("listitem")).toHaveCount(2);
});

test("adding media with subtitles to a project shows their cues", async ({
  page,
}) => {
  await page
    .getByRole("list", { name: "Projects" })
    .getByRole("button")
    .first()
    .click();
  await pickFixture(page, "Add media", "sample.mp4");
  await pickFixture(page, "Add target-language subtitles", "sample.srt");
  const subtitles = page.getByRole("list", { name: "Subtitles" });
  await expect(subtitles).toContainText("The cat is sleeping.");
});

/** Clicks the button that opens a file dialog and picks the fixture file in it. */
async function pickFixture(
  page: Page,
  buttonName: string,
  fixtureName: string,
): Promise<void> {
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: buttonName }).click();
  await (await chooser).setFiles(fixturePath(fixtureName));
}
