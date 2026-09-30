import { expect, test } from "@playwright/test";

test("subtitles still render without a server", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue offline" }).click();
  const subtitles = page.getByRole("list", { name: "Subtitles" });
  await expect(subtitles).toContainText("The cat is sleeping.");
});
