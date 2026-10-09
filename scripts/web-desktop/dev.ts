import type { ChildProcess } from "node:child_process";
import { once } from "node:events";
import { constants } from "node:os";
import { join } from "node:path";

import { readTextOrNull } from "./desktopServerFile.ts";
import { repositoryRoot } from "./repositoryRoot.ts";
import { hasExited, interruptAll, spawnChild } from "./runTogether.ts";
import { ensureLanForwarderPortFree, serveWebApp } from "./serveWebApp.ts";
import { waitForDesktopServer } from "./waitForDesktopServer.ts";

/**
 * Runs the desktop app, waits until its embedded server answers with the token it has just written,
 * and then serves the web app against that server to this machine and to the local network.
 *
 * Usage: `node scripts/web-desktop/dev.ts`
 */
const serverFilePath = join(repositoryRoot, ".dev/desktop-server.env");
const stopSignals = ["SIGINT", "SIGTERM"] as const;

await main();

async function main(): Promise<void> {
  await ensureLanForwarderPortFree();
  const previousText = readTextOrNull(serverFilePath);
  const desktop = spawnDesktop();
  const exitEarly = (code: number | null) => process.exit(code ?? 1);
  desktop.on("exit", exitEarly);
  // Before runTogether takes over the desktop app, a signal sent only to this process must still stop it.
  const stopDesktop = (signal: NodeJS.Signals) => {
    desktop.off("exit", exitEarly);
    void exitAfterDesktop(desktop, signal);
  };
  for (const signal of stopSignals) process.on(signal, stopDesktop);
  console.log(
    "Waiting for the desktop app to start its server. The first build can take several minutes.",
  );
  const file = await waitForDesktopServer(serverFilePath, previousText);
  desktop.off("exit", exitEarly);
  await serveWebApp(file, [desktop]);
  for (const signal of stopSignals) process.off(signal, stopDesktop);
}

function spawnDesktop(): ChildProcess {
  return spawnChild(
    {
      command: "pnpm",
      args: ["--filter", "@easyimmerse/native", "dev"],
      env: {},
    },
    repositoryRoot,
  );
}

/** Interrupts the desktop app and, once it has exited, exits as a process stopped by `signal` would. */
async function exitAfterDesktop(
  desktop: ChildProcess,
  signal: NodeJS.Signals,
): Promise<void> {
  if (!hasExited(desktop)) {
    const exited = once(desktop, "exit");
    interruptAll([desktop]);
    await exited;
  }
  process.exit(128 + constants.signals[signal]);
}
