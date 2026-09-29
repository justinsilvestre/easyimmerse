import { defineConfig, devices } from "@playwright/test";

const serverCommand =
  "node ../server/dist/easyimmerse-server.mjs --port 4100 --database :memory:";

/** Runs the built web app together with the built server. Both must be built before the tests. */
export default defineConfig({
  testDir: "e2e",
  testMatch: "*.e2e.ts",
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://localhost:4173",
    trace: "on-first-retry",
  },
  webServer: [
    { command: serverCommand, url: "http://localhost:4100/health" },
    {
      command: "pnpm preview --port 4173 --strictPort",
      url: "http://localhost:4173",
    },
  ],
  projects: [
    { name: "chromium", use: devices["Desktop Chrome"] },
    { name: "firefox", use: devices["Desktop Firefox"] },
    { name: "webkit", use: devices["Desktop Safari"] },
    { name: "mobile-chromium", use: devices["Pixel 7"] },
    { name: "mobile-webkit", use: devices["iPhone 15"] },
  ],
});
