import { probeServer } from "./probeServer.ts";
import { standaloneServerUrl } from "./standaloneServer.ts";

/**
 * Exits with an error while the standalone server of `mise run web:desktop` runs,
 * because the desktop app would then convert into the same cache.
 *
 * Usage: `node scripts/web-desktop/guardDesktop.ts`
 */
if ((await probeServer(standaloneServerUrl, "")) !== "absent") {
  console.error(
    `A server answers at ${standaloneServerUrl}, probably the standalone server of 'mise run web:desktop', which uses the desktop app's database and cache. Stop that task before starting the desktop app.`,
  );
  process.exit(1);
}
