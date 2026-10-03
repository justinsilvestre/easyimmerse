import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { appiumHome, createAppiumConfig } from "./appiumConfig.ts";

// The uiautomator2 driver accepts this capability, but @wdio/types does not declare it.
declare global {
  namespace WebdriverIO {
    interface Capabilities {
      "appium:chromedriverAutodownload"?: boolean;
    }
  }
}

// The APK that `tauri android build --debug --target x86_64 --apk` writes. Only debug builds expose a debuggable WebView.
const apkPath = fileURLToPath(
  new URL(
    "../src-tauri/gen/android/app/build/outputs/apk/universal/debug/app-universal-debug.apk",
    import.meta.url,
  ),
);

/**
 * Drives the app on a running Android emulator through Appium's UiAutomator2 driver.
 * Appium installs the APK, clears its data so the app seeds its placeholder projects,
 * downloads a chromedriver matching the emulator's WebView, and switches the session into the WebView.
 */
export const config = createAppiumConfig(
  {
    platformName: "Android",
    "appium:automationName": "UiAutomator2",
    "appium:app": apkPath,
    "appium:autoWebview": true,
    "appium:autoWebviewTimeout": 60_000,
    "appium:chromedriverAutodownload": true,
    "appium:chromedriverExecutableDir": join(appiumHome, "chromedriver"),
    "appium:adbExecTimeout": 120_000,
    "appium:androidInstallTimeout": 180_000,
    "appium:uiautomator2ServerInstallTimeout": 180_000,
    "appium:newCommandTimeout": 300,
  },
  // Appium 3 only downloads chromedriver when this feature is allowed by name.
  { allowInsecure: "uiautomator2:chromedriver_autodownload" },
);
