import type { DesktopStorage } from "./desktopServerFile.ts";

/** Port 8787 is the desktop app's and 8788 is `mise run web-dev`'s. */
export const standaloneServerUrl = "http://127.0.0.1:8789";

/** The `cargo` arguments that serve the desktop app's database and cache from the standalone server. */
export function standaloneServerCargoArgs(storage: DesktopStorage): string[] {
  const bind = new URL(standaloneServerUrl).host;
  return [
    ...["run", "--quiet", "-p", "easyimmerse-server", "--", "serve"],
    ...["--bind", bind, "--db", storage.databasePath],
    ...["--cache-dir", storage.cacheDir],
    // The embedded server accepts local paths and seeds an empty database, so this one does too.
    ...["--allow-local-paths", "--seed-placeholders"],
  ];
}
