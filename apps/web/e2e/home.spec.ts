import { expect, test } from "@playwright/test";

test("the home screen lists the two placeholder projects", async ({ page }) => {
  await page.goto("/");
  const projects = page.getByRole("list", { name: "Projects" });
  await expect(projects.getByRole("listitem")).toHaveCount(2);
});
