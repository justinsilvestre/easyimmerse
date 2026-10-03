import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  prepareSimulator,
  simulatorName,
  uninstallApp,
} from "./iosSimulator.ts";

const bundleId = "com.easyimmerse.app";

// `tauri ios build --target <arch>` leaves the simulator app under gen/apple/build/<arch>.
const buildDirectory = process.arch === "arm64" ? "arm64-sim" : "x86_64";
const appPath = fileURLToPath(
  new URL(
    `../src-tauri/gen/apple/build/${buildDirectory}/easyImmerse.app`,
    import.meta.url,
  ),
);

// WebDriverAgent is built into the gitignored Appium home once, and later runs reuse that build.
const derivedDataPath = fileURLToPath(
  new URL("../.appium/WebDriverAgent", import.meta.url),
);
const isWebDriverAgentBuilt = existsSync(
  `${derivedDataPath}/Build/Products/Debug-iphonesimulator/WebDriverAgentRunner-Runner.app`,
);

/** Drives the iOS simulator build through Appium's XCUITest driver, attached to the app's WKWebView. */
export const config: WebdriverIO.Config = {
  runner: "local",
  specs: ["./specs/**/*.spec.ts"],
  maxInstances: 1,
  capabilities: [
    {
      platformName: "iOS",
      "appium:automationName": "XCUITest",
      "appium:deviceName": simulatorName,
      "appium:app": appPath,
      "appium:autoWebview": true,
      // A simulator that has just booted can take a while to expose the web inspector.
      "appium:webviewConnectTimeout": 30_000,
      "appium:derivedDataPath": derivedDataPath,
      "appium:usePrebuiltWDA": isWebDriverAgentBuilt,
      "appium:wdaLaunchTimeout": 120_000,
    },
  ],
  services: [["appium", { args: { basePath: "/" } }]],
  framework: "mocha",
  mochaOpts: { ui: "bdd", timeout: 120_000 },
  reporters: ["spec"],
  logLevel: "warn",
  waitforTimeout: 10_000,
  // Each run starts from a fresh install, so the app opens a new database with the placeholder projects.
  onPrepare: () => uninstallApp(prepareSimulator(), bundleId),
};
