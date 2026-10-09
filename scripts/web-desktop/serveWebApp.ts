import type { ChildProcess } from "node:child_process";

import { findLanAddress } from "./lanAddress.ts";
import { lanForwarderPort, startLanForwarder } from "./lanForwarder.ts";
import { probeServer } from "./probeServer.ts";
import { repositoryRoot } from "./repositoryRoot.ts";
import { type ChildCommand, interruptAll, runTogether } from "./runTogether.ts";

/** The port `.claude/launch.json` expects the web app on. */
const webAppPort = 5173;
const webAppPortArgs = ["--port", String(webAppPort), "--strictPort"];

/** A server on this machine's loopback interface, with the token it accepts. */
export interface Upstream {
  url: string;
  token: string;
}

/** Exits with an error while something answers on the forwarder's port. */
export async function ensureLanForwarderPortFree(): Promise<void> {
  const url = `http://127.0.0.1:${lanForwarderPort}`;
  if ((await probeServer(url, "")) !== "absent") {
    console.error(
      `A server already answers at ${url}, probably from another 'mise run web:desktop' or 'mise run dev'. Stop it first.`,
    );
    process.exit(1);
  }
}

/** The children that serve the web app, once they run and forward signals themselves. */
export interface WebAppSession {
  /** Resolves once every child has exited and the forwarder has closed. */
  finished: Promise<void>;
}

/**
 * Serves the web app against `upstream` to this machine and to the local network,
 * alongside the `running` children, until one of them exits.
 * Without a local network address, serves it to this machine only.
 */
export async function serveWebApp(
  upstream: Upstream,
  running: ChildProcess[] = [],
): Promise<WebAppSession> {
  const lanAddress = findLanAddress();
  if (lanAddress === null) {
    console.log(
      "No local network address was found, so the web app is served to this machine only.",
    );
    const vite = viteCommand(upstream, webAppPortArgs);
    return { finished: runTogether([vite], repositoryRoot, running) };
  }
  const forwarder = await startLanForwarder(upstream.url).catch((error) =>
    stop(running, describeListenError(error)),
  );
  const forwarderUrl = `http://${lanAddress}:${lanForwarderPort}`;
  console.log(
    `\nWeb app for this machine and phones on the local network: http://${lanAddress}:${webAppPort}\n(API forwarded from ${upstream.url} through ${forwarderUrl})\n`,
  );
  const vite = viteCommand({ ...upstream, url: forwarderUrl }, [
    "--host",
    ...webAppPortArgs,
  ]);
  const children = runTogether([vite], repositoryRoot, running);
  // Open connections, such as a phone streaming media, would otherwise keep this process alive.
  const finished = children.then(() => {
    forwarder.closeAllConnections();
    forwarder.close();
  });
  return { finished };
}

function describeListenError(error: unknown): string {
  const code = (error as NodeJS.ErrnoException).code;
  return code === "EADDRINUSE"
    ? `Port ${lanForwarderPort} is taken, probably by another 'mise run web:desktop' or 'mise run dev'. Stop it first.`
    : String(error);
}

function viteCommand(server: Upstream, viteArgs: string[]): ChildCommand {
  return {
    command: "pnpm",
    args: ["--filter", "@easyimmerse/web", "dev", ...viteArgs],
    env: {
      VITE_EASYIMMERSE_SERVER_URL: server.url,
      VITE_EASYIMMERSE_TOKEN: server.token,
    },
  };
}

function stop(running: ChildProcess[], message: string): never {
  console.error(message);
  interruptAll(running);
  process.exit(1);
}
