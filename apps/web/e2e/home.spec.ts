import { expect, test } from "@playwright/test";

test("the home screen lists the placeholder projects", async ({ page }) => {
  await page.goto("/");
  const projects = page.getByRole("list", { name: "Projects" });
  await expect(projects).toContainText("Spanish practice");
  await expect(projects).toContainText("Japanese drama");
});

test("clicking a project opens its screen", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Spanish practice" }).click();
  await expect(
    page.getByRole("heading", { name: "Spanish practice" }),
  ).toBeVisible();
});

test("Create new project opens the new project form", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Create new project" }).click();
  await expect(
    page.getByRole("heading", { name: "New project" }),
  ).toBeVisible();
});
