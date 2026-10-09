import { join } from "node:path";

import { repositoryRoot } from "./repositoryRoot.ts";
import { interruptAll, spawnChild } from "./runTogether.ts";
import { ensureLanForwarderPortFree, serveWebApp } from "./serveWebApp.ts";
import {
  readTextOrNull,
  waitForDesktopServer,
} from "./waitForDesktopServer.ts";

/**
 * Runs the desktop app, waits until its embedded server answers with the token it has just written,
 * and then serves the web app against that server to this machine and to the local network.
 *
 * Usage: `node scripts/web-desktop/dev.ts`
 */
const serverFilePath = join(repositoryRoot, ".dev/desktop-server.env");

await ensureLanForwarderPortFree();
const previousText = readTextOrNull(serverFilePath);
const desktop = spawnChild(
  {
    command: "pnpm",
    args: ["--filter", "@easyimmerse/native", "dev"],
    env: {},
  },
  repositoryRoot,
);
const exitEarly = (code: number | null) => process.exit(code ?? 1);
desktop.on("exit", exitEarly);
// Until runTogether forwards signals, a signal sent only to this process must still stop the desktop app.
const stopDesktop = () => {
  interruptAll([desktop]);
  process.exit(1);
};
process.on("SIGINT", stopDesktop);
process.on("SIGTERM", stopDesktop);
console.log(
  "Waiting for the desktop app to start its server. The first build can take several minutes.",
);
const file = await waitForDesktopServer(serverFilePath, previousText);
desktop.off("exit", exitEarly);
process.off("SIGINT", stopDesktop);
process.off("SIGTERM", stopDesktop);
await serveWebApp(file, [desktop]);
