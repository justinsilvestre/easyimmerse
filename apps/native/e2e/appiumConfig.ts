import { fileURLToPath } from "node:url";
import type { AppiumServerArguments } from "@wdio/appium-service";

/** Where Appium keeps its drivers and the chromedriver binaries it downloads. The directory is gitignored. */
export const appiumHome = fileURLToPath(new URL("../.appium", import.meta.url));

// The mise config sets the variable, so this only covers a run outside mise.
process.env.APPIUM_HOME ??= appiumHome;

// The Appium service and the test worker write their logs here, and CI uploads them when the tests fail.
const logDirectory = fileURLToPath(new URL("./logs", import.meta.url));

/**
 * Builds a WebdriverIO config that starts Appium from this package's dependencies and drives the app in its WebView.
 * The Android and iOS configs differ in their capabilities, in the insecure Appium features they allow,
 * and in the settings they override.
 */
export function createAppiumConfig(
  capabilities: WebdriverIO.Capabilities,
  appiumArgs: AppiumServerArguments = {},
  overrides: Partial<WebdriverIO.Config> = {},
): WebdriverIO.Config {
  return {
    runner: "local",
    specs: ["./specs/**/*.spec.ts"],
    maxInstances: 1,
    capabilities: [capabilities],
    // Appium loads its driver slowly on a cold CI runner.
    services: [["appium", { args: appiumArgs, appiumStartTimeout: 120_000 }]],
    framework: "mocha",
    mochaOpts: { ui: "bdd", timeout: 120_000 },
    reporters: ["spec"],
    logLevel: "warn",
    outputDir: logDirectory,
    waitforTimeout: 15_000,
    ...overrides,
  };
}
