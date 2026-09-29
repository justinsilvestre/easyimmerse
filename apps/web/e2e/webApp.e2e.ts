import { expect, test } from "@playwright/test";

const serverUrl = "http://localhost:4100";

test.describe("web app", () => {
  test("shows the home screen", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "easyImmerse",
    );
  });

  test("applies the shared styles", async ({ page }) => {
    await page.goto("/");
    const button = page.getByRole("button", { name: "System status" });
    await expect(button).toHaveCSS("border-radius", "6px");
  });

  test("reaches the server and its media tools", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "System status" }).click();
    await expect(page.getByTestId("ffmpeg version")).toHaveText(/^\d/);
  });

  test("lists the projects stored on the server", async ({ page, request }) => {
    const name = `Project ${Date.now()}`;
    await request.post(`${serverUrl}/projects`, {
      data: { name, targetLanguage: "de" },
    });
    await page.goto("/");
    await expect(page.getByText(name)).toBeVisible();
  });

  test("registers a service worker for offline use", async ({ page }) => {
    await page.goto("/");
    const isRegistered = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.ready;
      return registration.active !== null;
    });
    expect(isRegistered).toBe(true);
  });
});
