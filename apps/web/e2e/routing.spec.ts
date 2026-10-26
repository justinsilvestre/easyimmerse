import { expect, type Page, test } from "@playwright/test";

const projectPath = /\/projects\/[^/?]+$/;

/** Opens the first project of the home screen's list and returns its name. */
async function openFirstProject(page: Page): Promise<string> {
  await page.goto("/");
  await page
    .getByRole("list", { name: "Projects" })
    .getByRole("link")
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

test.describe("a click on a project with Ctrl or Cmd held", () => {
  /** Clicks the home screen's first project with the platform's modifier key and returns the tab it opens. */
  async function modifierClickFirstProject(page: Page) {
    await page.goto("/");
    const opened = page.context().waitForEvent("page");
    await page
      .getByRole("list", { name: "Projects" })
      .getByRole("link")
      .first()
      .click({ modifiers: ["ControlOrMeta"] });
    return opened;
  }

  test("opens the project in a new tab", async ({ page }) => {
    const tab = await modifierClickFirstProject(page);
    await expect(tab).toHaveURL(projectPath);
  });

  test("leaves the home screen open in the current tab", async ({ page }) => {
    await modifierClickFirstProject(page);
    await expect(page).toHaveURL(/^https?:\/\/[^/]+\/$/);
  });
});

test("a link to a project that does not exist opens the home screen", async ({
  page,
}) => {
  await page.goto("/projects/no-such-project");
  await expect(page).toHaveURL(/^https?:\/\/[^/]+\/$/);
});

test.describe("after the app's own Back", () => {
  // The history began at a blank page before the app's start, which Playwright keeps as an entry.
  test("the browser's Back leaves the app's start, rather than returning to the screen it left", async ({
    page,
  }) => {
    await openFirstProject(page);
    await page.getByRole("link", { name: "Projects", exact: true }).click();
    await expect(page).toHaveURL(/^https?:\/\/[^/]+\/$/);
    await page.goBack();
    await expect(page).toHaveURL("about:blank");
  });

  test("the browser's Forward returns to the settings page it closed", async ({
    page,
  }) => {
    await openFirstProject(page);
    await openSettings(page);
    await page.getByRole("link", { name: "Back", exact: true }).click();
    await expect(settingsHeading(page)).toHaveCount(0);
    await page.goForward();
    await expect(settingsHeading(page)).toBeVisible();
  });

  test("the browser's Back leaves a screen opened from a link for where the history began", async ({
    page,
    context,
  }) => {
    await openFirstProject(page);
    const linked = await context.newPage();
    await linked.goto(page.url());
    await linked.getByRole("link", { name: "Projects", exact: true }).click();
    await expect(linked).toHaveURL(/^https?:\/\/[^/]+\/$/);
    await linked.goBack();
    await expect(linked).toHaveURL("about:blank");
  });
});
