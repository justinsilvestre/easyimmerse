import { resolve } from "node:path";
import { type BrowserContext, chromium } from "@playwright/test";

const extensionPath = resolve(import.meta.dirname, "../dist");

export type BrowserWithExtension = {
  context: BrowserContext;
  extensionId: string;
};

/** Opens Chromium with the built extension installed. */
export async function launchBrowserWithExtension(): Promise<BrowserWithExtension> {
  const context = await chromium.launchPersistentContext("", {
    // Extensions are only supported by the full Chromium browser, not by its headless shell.
    channel: "chromium",
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
  });
  return { context, extensionId: await readExtensionId(context) };
}

/** The ID of the extension is the host name in the address of its background script. */
async function readExtensionId(context: BrowserContext): Promise<string> {
  const [startedWorker] = context.serviceWorkers();
  const worker = startedWorker ?? (await context.waitForEvent("serviceworker"));
  return new URL(worker.url()).host;
}
