import { defineConfig, devices } from "@playwright/test";

// The port differs from the desktop app's 8787 and the extension tests' 8798, so a running server of either is never reused by mistake.
const serverPort = 8797;
const serverUrl = `http://127.0.0.1:${serverPort}`;
const token = "e2e-token";
const onlineUrl = "http://127.0.0.1:4173";
const offlineUrl = "http://127.0.0.1:4174";
const reuseExistingServer = !process.env.CI;

/** The web servers start in order: the API server, the online build, then the offline build. */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  projects: [
    {
      name: "online",
      testIgnore: /offline\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], baseURL: onlineUrl },
    },
    {
      name: "offline",
      testMatch: /offline\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], baseURL: offlineUrl },
    },
    // A phone, whose taps differ from clicks, for the tests where that matters. CI installs Chromium only.
    {
      name: "touch",
      testMatch: /japaneseLookup\.spec\.ts/,
      use: { ...devices["Pixel 7"], baseURL: onlineUrl },
    },
  ],
  webServer: [
    {
      command: `cargo run -p easyimmerse-server -- serve --bind 127.0.0.1:${serverPort} --token ${token} --seed-placeholders`,
      url: `${serverUrl}/health`,
      reuseExistingServer,
      timeout: 300_000,
    },
    {
      command:
        "pnpm exec vite build && pnpm exec vite preview --host 127.0.0.1 --port 4173 --strictPort",
      url: onlineUrl,
      reuseExistingServer,
      timeout: 120_000,
      env: {
        VITE_EASYIMMERSE_SERVER_URL: serverUrl,
        VITE_EASYIMMERSE_TOKEN: token,
      },
    },
    {
      command:
        "pnpm exec vite build --outDir dist/offline && pnpm exec vite preview --outDir dist/offline --host 127.0.0.1 --port 4174 --strictPort",
      url: offlineUrl,
      reuseExistingServer,
      timeout: 120_000,
      // Empty values override anything a local .env file sets, so this build has no server.
      env: { VITE_EASYIMMERSE_SERVER_URL: "", VITE_EASYIMMERSE_TOKEN: "" },
    },
  ],
});
