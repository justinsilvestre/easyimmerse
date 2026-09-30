import { expect, test } from "./fixtures.ts";

test.beforeEach(async ({ page, extensionId }) => {
  await page.goto(`chrome-extension://${extensionId}/sidepanel.html`);
});

test("the side panel lists the two placeholder projects", async ({ page }) => {
  const projects = page.getByRole("list", { name: "Projects" });
  await expect(projects.getByRole("listitem")).toHaveCount(2);
});

test("opening a project shows the cues of the fixture subtitles", async ({
  page,
}) => {
  await page
    .getByRole("list", { name: "Projects" })
    .getByRole("button")
    .first()
    .click();
  const subtitles = page.getByRole("list", { name: "Subtitles" });
  await expect(subtitles).toContainText("The cat is sleeping.");
});
