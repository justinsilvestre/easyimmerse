import { expect, test } from "@playwright/test";
import { launchBrowserWithExtension } from "./launchBrowserWithExtension.ts";

async function openPopup() {
  const { context, extensionId } = await launchBrowserWithExtension();
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/popup.html`);
  return { context, page };
}

test.describe("browser extension", () => {
  test("shows the home screen in its popup", async () => {
    const { context, page } = await openPopup();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "easyImmerse",
    );
    await context.close();
  });

  test("reaches the server and its media tools", async () => {
    const { context, page } = await openPopup();
    await page.getByRole("button", { name: "System status" }).click();
    await expect(page.getByTestId("ffmpeg version")).toHaveText(/^\d/);
    await context.close();
  });

  test("runs its content script on web pages", async () => {
    const { context } = await launchBrowserWithExtension();
    const page = await context.newPage();
    await page.goto("http://localhost:4100/health");
    await expect(page.locator("html")).toHaveAttribute(
      "data-easyimmerse",
      "ready",
    );
    await context.close();
  });
});
