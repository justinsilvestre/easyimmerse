import { join } from "node:path";

import { repositoryRoot } from "./repositoryRoot.ts";
import { spawnChild } from "./runTogether.ts";
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
console.log(
  "Waiting for the desktop app to start its server. The first build can take several minutes.",
);
const file = await waitForDesktopServer(serverFilePath, previousText);
desktop.off("exit", exitEarly);
await serveWebApp(file, [desktop]);
