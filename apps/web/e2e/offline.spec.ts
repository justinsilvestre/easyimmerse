import path from "node:path";
import { expect, test } from "@playwright/test";

const subtitlesFixture = path.join(
  import.meta.dirname,
  "../../../fixtures/sample.srt",
);

test("a subtitles file is read in the browser without a server", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue offline" }).click();
  const fileChooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Open a subtitles file" }).click();
  await (await fileChooser).setFiles(subtitlesFixture);
  const subtitles = page.getByRole("list", { name: "Subtitles" });
  await expect(subtitles).toContainText("The cat is sleeping.");
});
