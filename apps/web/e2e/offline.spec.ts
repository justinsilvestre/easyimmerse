import { expect, test } from "@playwright/test";

test("the home screen explains that projects need a server", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByText("Projects need the desktop app or a server"),
  ).toBeVisible();
});

test("the home screen still offers help without a server", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Help" })).toBeVisible();
});
