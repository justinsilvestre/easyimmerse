import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { appiumHome } from "./appiumConfig.ts";

const appium = fileURLToPath(
  new URL("../node_modules/.bin/appium", import.meta.url),
);

/**
 * The simulator build of WebDriverAgent, the app through which the XCUITest driver controls the simulator.
 * Its directory names the WebDriverAgent version bundled with the installed driver,
 * so a driver update leads to a new download.
 */
export function webDriverAgentPath(): string {
  const directory = join(appiumHome, `WebDriverAgent-${bundledVersion()}-sim`);
  return join(directory, "WebDriverAgentRunner-Runner.app");
}

/**
 * Downloads the driver's prebuilt WebDriverAgent for this machine's simulator architecture when it is missing.
 * Building it with xcodebuild instead takes several minutes on a CI runner.
 */
export function downloadWebDriverAgent(appPath: string) {
  if (existsSync(appPath)) return;
  const outdir = join(appPath, "..");
  const args = ["--outdir", outdir, "--platform", "iOS", "--kind", "sim"];
  execFileSync(
    appium,
    ["driver", "run", "xcuitest", "download-wda", "--", ...args],
    {
      stdio: "inherit",
    },
  );
}

function bundledVersion(): string {
  const packageJson = join(
    appiumHome,
    "node_modules/appium-xcuitest-driver/node_modules/appium-webdriveragent/package.json",
  );
  return JSON.parse(readFileSync(packageJson, "utf8")).version;
}
