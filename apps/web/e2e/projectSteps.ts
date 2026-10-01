import { fixturePath } from "@easyimmerse/fixtures";
import { expect, type Page } from "@playwright/test";

/** Creates a project through the new project form and waits for its screen. */
export async function createProject(
  page: Page,
  name: string,
  languages: { target: string; translation: string },
): Promise<void> {
  await page.goto("/");
  await page.getByRole("button", { name: "Create new project" }).click();
  await page.getByRole("textbox", { name: "Name" }).fill(name);
  await page
    .getByRole("combobox", { name: "Target language" })
    .selectOption(languages.target);
  await page
    .getByRole("combobox", { name: "Translation language" })
    .selectOption(languages.translation);
  await page.getByRole("button", { name: "Create project" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name, exact: true }),
  ).toBeVisible();
}

/** Clicks the button that opens a file dialog and picks the fixture file in it. */
export async function pickFixture(
  page: Page,
  buttonName: string,
  fixtureName: string,
): Promise<void> {
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: buttonName }).click();
  await (await chooser).setFiles(fixturePath(fixtureName));
}

/** Adds the fixture media file and its target-language subtitles to the open project, and waits for the cues. */
export async function addMediaWithSubtitles(
  page: Page,
  mediaName: string,
): Promise<void> {
  await pickFixture(page, "Add media", mediaName);
  await expect(page.getByRole("heading", { name: mediaName })).toBeVisible();
  await pickFixture(page, "Add target-language subtitles", "sample.srt");
  await expect(page.getByRole("list", { name: "Subtitles" })).toContainText(
    "The cat is sleeping.",
  );
}
