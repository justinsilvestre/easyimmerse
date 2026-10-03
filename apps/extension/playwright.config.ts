import { defineConfig } from "@playwright/test";

// The port differs from the desktop app's 8787 and the web tests' 8797, so a running server of either is never reused by mistake.
const serverPort = 8798;
const serverUrl = `http://127.0.0.1:${serverPort}`;
const token = "e2e-token";

/** The API server starts first; the global setup then builds the extension against it. */
export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/buildExtension.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  webServer: {
    command: `cargo run -p easyimmerse-server -- serve --bind 127.0.0.1:${serverPort} --token ${token} --seed-placeholders`,
    url: `${serverUrl}/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
  },
});

export { serverUrl, token };
