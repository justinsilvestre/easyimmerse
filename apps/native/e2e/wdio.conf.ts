import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { TauriCapabilities } from "@wdio/tauri-service";

// The debug build that `tauri build --debug --no-bundle` writes. Only debug builds with the webdriver feature can serve WebDriver.
const binaryName =
  process.platform === "win32"
    ? "easyimmerse-native.exe"
    : "easyimmerse-native";
const appBinaryPath = fileURLToPath(
  new URL(`../../../target/debug/${binaryName}`, import.meta.url),
);

// Each run gets an empty database, so the app seeds its placeholder projects and leaves the developer's data alone.
const databasePath = join(
  mkdtempSync(join(tmpdir(), "easyimmerse-e2e-desktop-")),
  "easyimmerse.sqlite",
);

const capabilities: TauriCapabilities[] = [
  { browserName: "tauri", "tauri:options": { application: appBinaryPath } },
];

/** Drives the desktop app through the WebDriver server embedded in debug builds, which works on Linux, macOS, and Windows. */
export const config: WebdriverIO.Config = {
  runner: "local",
  specs: ["./specs/**/*.spec.ts"],
  maxInstances: 1,
  capabilities,
  services: [
    [
      "tauri",
      {
        driverProvider: "embedded",
        env: { EASYIMMERSE_DATABASE: databasePath },
      },
    ],
  ],
  framework: "mocha",
  mochaOpts: { ui: "bdd", timeout: 60_000 },
  reporters: ["spec"],
  logLevel: "warn",
  waitforTimeout: 10_000,
};
