import { defineConfig } from "@playwright/test";

const serverCommand =
  "node ../server/dist/easyimmerse-server.mjs --port 4100 --database :memory:";

/** Runs the built extension together with the built server. Both must be built before the tests. */
export default defineConfig({
  testDir: "e2e",
  testMatch: "*.e2e.ts",
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: { trace: "on-first-retry" },
  webServer: [
    {
      command: serverCommand,
      url: "http://localhost:4100/health",
      reuseExistingServer: !process.env.CI,
    },
  ],
});
