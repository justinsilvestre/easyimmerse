import path from "node:path";
import { type BrowserContext, test as base, chromium } from "@playwright/test";

const extensionDir = path.join(import.meta.dirname, "../.output/chrome-mv3");

/** Playwright's base test with a Chromium context that has the built extension loaded, and the extension's id. */
export const test = base.extend<{
  context: BrowserContext;
  extensionId: string;
}>({
  // biome-ignore lint/correctness/noEmptyPattern: Playwright fixtures destructure their dependencies, and this one has none.
  context: async ({}, use) => {
    const context = await launchWithExtension();
    await use(context);
    await context.close();
  },
  extensionId: async ({ context }, use) => {
    await use(await findExtensionId(context));
  },
});

export const expect = test.expect;

function launchWithExtension(): Promise<BrowserContext> {
  return chromium.launchPersistentContext("", {
    channel: "chromium",
    args: [
      `--disable-extensions-except=${extensionDir}`,
      `--load-extension=${extensionDir}`,
    ],
  });
}

/** The extension's id is the host of its background service worker's URL. */
async function findExtensionId(context: BrowserContext): Promise<string> {
  const worker =
    context.serviceWorkers()[0] ??
    (await context.waitForEvent("serviceworker"));
  return new URL(worker.url()).host;
}
