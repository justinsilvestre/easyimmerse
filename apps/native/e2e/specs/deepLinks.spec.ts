import { $, browser, expect } from "@wdio/globals";

const appId = "com.easyimmerse.app";

async function openLink(link: string) {
  await browser.deepLink(link, appId);
}

async function terminateApp() {
  const target = browser.isIOS ? { bundleId: appId } : { appId };
  await browser.execute("mobile: terminateApp", target);
}

/**
 * Moves the session into the WebView of the app's new process.
 * Leaving for the native context first makes the driver connect again even when the WebView's context keeps its name.
 */
async function attachToNewWebview() {
  await browser.switchAppiumContext("NATIVE_APP");
  let webview: string | undefined;
  await browser.waitUntil(
    async () => {
      const contexts = (await browser.getContexts()).map(String);
      webview = contexts.find((context) => context.startsWith("WEBVIEW"));
      return webview !== undefined;
    },
    { timeout: 60_000, timeoutMsg: "the app's WebView never appeared" },
  );
  await browser.switchAppiumContext(webview as string);
}

describe("an easyimmerse:// link", () => {
  it("opens the screen it names while the app runs", async () => {
    await expect($('ul[aria-label="Projects"]')).toBeDisplayed();
    await openLink("easyimmerse://library");
    await expect($("h1=Library")).toBeDisplayed();
  });

  // On iOS, tao drops the link that launches the app (tauri-apps/tao#1248), so the cold start waits for a fix there.
  (browser.isIOS ? it.skip : it)(
    "opens the screen it names when it starts the app",
    async () => {
      await terminateApp();
      await openLink("easyimmerse://projects/new");
      await attachToNewWebview();
      await expect($("h1=New project")).toBeDisplayed();
    },
  );
});
