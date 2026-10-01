import { expect, test } from "@playwright/test";
import {
  addMediaWithSubtitles,
  createProject,
  pickFixture,
} from "./projectSteps.ts";

test("a word in the subtitles becomes a saved flashcard", async ({ page }) => {
  await createProject(page, "E2E", { target: "en", translation: "de" });
  await addMediaWithSubtitles(page, "sample.mp4");

  await page.getByRole("button", { name: "Back", exact: true }).click();
  // A server reused from an earlier run may already hold the dictionary.
  const setUp = page.getByRole("button", { name: "Set up dictionaries" });
  if (await setUp.isVisible())
    await pickFixture(page, "Set up dictionaries", "sample-yomitan-en.zip");
  await expect(page.getByText("Dictionaries ready for English")).toBeVisible();

  await page.getByRole("button", { name: "sample.mp4", exact: true }).click();
  const subtitles = page.getByRole("list", { name: "Subtitles" });
  await subtitles.getByRole("listitem").first().getByRole("button").click();
  const cat = page
    .getByRole("region", { name: "Overlaid subtitles" })
    .getByRole("button", { name: "cat" });
  await cat.hover();
  const dictionary = page.getByRole("dialog", { name: "Dictionary" });
  await expect(dictionary.getByText("Katze").first()).toBeVisible();

  await cat.click();
  const editor = page.getByRole("dialog", { name: "New flashcard" });
  await expect(
    editor.getByRole("textbox", { name: "Definition in your language" }),
  ).toHaveValue(/Katze/);
  await editor.getByRole("button", { name: "Save" }).click();
  await expect(editor).toBeHidden();

  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page.getByText("1 flashcard")).toBeVisible();
});
