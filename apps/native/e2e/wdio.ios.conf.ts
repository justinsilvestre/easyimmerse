import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { appiumHome, createAppiumConfig } from "./appiumConfig.ts";
import { prepareSimulator, uninstallApp } from "./iosSimulator.ts";

const bundleId = "com.easyimmerse.app";
const simulatorUdid = prepareSimulator();

// `tauri ios build --target <arch>` leaves the simulator app under gen/apple/build/<arch>.
const buildDirectory = process.arch === "arm64" ? "arm64-sim" : "x86_64";
const appPath = fileURLToPath(
  new URL(
    `../src-tauri/gen/apple/build/${buildDirectory}/easyImmerse.app`,
    import.meta.url,
  ),
);

// WebDriverAgent is built into the Appium home once, and later runs reuse that build.
const derivedDataPath = join(appiumHome, "WebDriverAgent");
const isWebDriverAgentBuilt = existsSync(
  join(
    derivedDataPath,
    "Build/Products/Debug-iphonesimulator/WebDriverAgentRunner-Runner.app",
  ),
);

/** Drives the iOS simulator build through Appium's XCUITest driver, attached to the app's WKWebView. */
export const config = createAppiumConfig(
  {
    platformName: "iOS",
    "appium:automationName": "XCUITest",
    "appium:udid": simulatorUdid,
    "appium:app": appPath,
    "appium:autoWebview": true,
    // The web inspector lists an unsigned app by process name rather than bundle id,
    // and the driver only inspects applications whose id it knows.
    "appium:additionalWebviewBundleIds": ["process-easyImmerse"],
    // The first launch after an install takes a while before the page has a URL.
    // The driver retries every 500 ms, so these allow about a minute.
    "appium:webviewConnectTimeout": 30_000,
    "appium:webviewConnectRetries": 120,
    "appium:derivedDataPath": derivedDataPath,
    "appium:usePrebuiltWDA": isWebDriverAgentBuilt,
    "appium:wdaLaunchTimeout": 300_000,
    "appium:showXcodeLog": Boolean(process.env.CI),
  },
  {},
  {
    // One attempt that outlasts the first WebDriverAgent launch, since a second attempt would overlap it.
    connectionRetryTimeout: 600_000,
    connectionRetryCount: 1,
    // Each run starts from a fresh install, so the app opens a new database with the placeholder projects.
    onPrepare: () => uninstallApp(simulatorUdid, bundleId),
  },
);
