import { expect, test } from "@playwright/test";
import { createProject, pickFixture } from "./projectSteps.ts";

test.beforeEach(async ({ page }) => {
  await createProject(page, "Reader spec", { target: "en", translation: "de" });
  await pickFixture(page, "Add media", "sample.epub");
});

test("an ebook added in the browser opens in the reader", async ({ page }) => {
  await expect(
    page.getByRole("heading", { name: "Chapter One" }),
  ).toBeVisible();
});

test("hovering a word in the ebook shows the dictionary pop-up", async ({
  page,
}) => {
  await page.getByRole("button", { name: "cat", exact: true }).first().hover();
  await expect(page.getByRole("dialog", { name: "Dictionary" })).toBeVisible();
});
