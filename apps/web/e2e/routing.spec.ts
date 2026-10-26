import { expect, type Page, test } from "@playwright/test";

const projectPath = /\/projects\/[^/?]+$/;

/** Opens the first project of the home screen's list and returns its name. */
async function openFirstProject(page: Page): Promise<string> {
  await page.goto("/");
  await page
    .getByRole("list", { name: "Projects" })
    .getByRole("button")
    .first()
    .click();
  await expect(page).toHaveURL(projectPath);
  const heading = page
    .getByRole("heading", { level: 1 })
    .filter({ hasNotText: /^Home$/ });
  await expect(heading).toBeVisible();
  return (await heading.textContent()) ?? "";
}

async function openSettings(page: Page) {
  await page.getByRole("button", { name: "Profile", exact: true }).click();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page).toHaveURL(/\?settings=general$/);
}

const settingsHeading = (page: Page) =>
  page.getByRole("heading", { name: "Settings", level: 1 });

test("a project opens again when the page reloads", async ({ page }) => {
  const name = await openFirstProject(page);
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
});

test("the browser's Back returns from a project to the home screen", async ({
  page,
}) => {
  await openFirstProject(page);
  await page.goBack();
  await expect(page.getByRole("list", { name: "Projects" })).toBeVisible();
});

test("the browser's Forward returns to the project that Back left", async ({
  page,
}) => {
  const name = await openFirstProject(page);
  await page.goBack();
  await expect(page.getByRole("list", { name: "Projects" })).toBeVisible();
  await page.goForward();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
});

test("Settings opened over a project open again when the page reloads", async ({
  page,
}) => {
  await openFirstProject(page);
  await openSettings(page);
  await page.reload();
  await expect(settingsHeading(page)).toBeVisible();
});

test("the browser's Back closes Settings opened over a project", async ({
  page,
}) => {
  await openFirstProject(page);
  await openSettings(page);
  await expect(settingsHeading(page)).toBeVisible();
  await page.goBack();
  await expect(settingsHeading(page)).toHaveCount(0);
});

test("a link to a project that does not exist opens the home screen", async ({
  page,
}) => {
  await page.goto("/projects/no-such-project");
  await expect(page).toHaveURL(/^https?:\/\/[^/]+\/$/);
});
