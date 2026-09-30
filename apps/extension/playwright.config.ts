import { defineConfig } from "@playwright/test";

const serverUrl = "http://127.0.0.1:8787";
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
    command: `cargo run -p easyimmerse-server -- serve --bind 127.0.0.1:8787 --token ${token} --seed-placeholders`,
    url: `${serverUrl}/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
  },
});

export { serverUrl, token };
