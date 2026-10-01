import { execFileSync } from "node:child_process";
import path from "node:path";
import { serverUrl, token } from "../playwright.config.ts";

/** Builds the Chrome extension pointed at the end-to-end test server. Playwright runs this once before the tests. */
export default function buildExtension(): void {
  execFileSync("pnpm", ["exec", "wxt", "build"], {
    cwd: path.join(import.meta.dirname, ".."),
    stdio: "inherit",
    env: {
      ...process.env,
      VITE_EASYIMMERSE_SERVER_URL: serverUrl,
      VITE_EASYIMMERSE_TOKEN: token,
    },
  });
}
