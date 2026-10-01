import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { defineConfig, devices } from "@playwright/test";
import { serverToken, serverUrl } from "./e2e/e2eServer.ts";

const onlineUrl = "http://127.0.0.1:4173";
const offlineUrl = "http://127.0.0.1:4174";
const reuseExistingServer = !process.env.CI;

// Each run gets an empty conversion cache, so the server converts media again instead of serving segments from an earlier run.
// Workers inherit the variable, so they do not create directories of their own.
process.env.EASYIMMERSE_E2E_CACHE_DIR ??= mkdtempSync(
  join(tmpdir(), "easyimmerse-e2e-conversions-"),
);

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
  ],
  webServer: [
    {
      // Local paths and the cache let the server stream fixtures it converts with ffmpeg, when ffmpeg is installed.
      command: `cargo run -p easyimmerse-server -- serve --bind 127.0.0.1:8787 --token ${serverToken} --seed-placeholders --allow-local-paths --cache-dir "${process.env.EASYIMMERSE_E2E_CACHE_DIR}"`,
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
        VITE_EASYIMMERSE_TOKEN: serverToken,
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
