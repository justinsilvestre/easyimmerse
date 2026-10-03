import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { AppiumServerArguments } from "@wdio/appium-service";

/** Where Appium keeps its drivers and the chromedriver binaries it downloads. The directory is gitignored. */
export const appiumHome = fileURLToPath(new URL("../.appium", import.meta.url));

// The mise config sets the variable, so this only covers a run outside mise.
process.env.APPIUM_HOME ??= appiumHome;

/**
 * Builds a WebdriverIO config that starts Appium from this package's dependencies and drives the app in its WebView.
 * The Android and iOS configs differ only in their capabilities and in the insecure Appium features they allow.
 */
export function createAppiumConfig(
  capabilities: WebdriverIO.Capabilities,
  appiumArgs: AppiumServerArguments = {},
): WebdriverIO.Config {
  return {
    runner: "local",
    specs: ["./specs/**/*.spec.ts"],
    maxInstances: 1,
    capabilities: [capabilities],
    services: [
      ["appium", { args: appiumArgs, logPath: join(appiumHome, "logs") }],
    ],
    framework: "mocha",
    mochaOpts: { ui: "bdd", timeout: 120_000 },
    reporters: ["spec"],
    logLevel: "warn",
    waitforTimeout: 15_000,
  };
}
