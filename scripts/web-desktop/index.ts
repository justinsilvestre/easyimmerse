import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { join } from "node:path";

import {
  type DesktopServerFile,
  type DesktopStorage,
  readDesktopServerFile,
} from "./desktopServerFile.ts";
import { probeServer } from "./probeServer.ts";
import { repositoryRoot } from "./repositoryRoot.ts";
import { spawnChild } from "./runTogether.ts";
import { ensureLanForwarderPortFree, serveWebApp } from "./serveWebApp.ts";
import {
  standaloneServerCargoArgs,
  standaloneServerUrl,
} from "./standaloneServer.ts";

/**
 * Runs the web app against the desktop app's embedded server, or, when the desktop app is not
 * running, against a standalone server on the desktop app's database and cache.
 * Serves it to this machine and to the local network.
 *
 * Usage: `node scripts/web-desktop/index.ts`
 */
const serverFileName = ".dev/desktop-server.env";
const ffmpegDir = join(repositoryRoot, "apps/native/src-tauri/binaries");

await main();

async function main(): Promise<void> {
  const file =
    readDesktopServerFile(join(repositoryRoot, serverFileName)) ??
    fail(
      `Start the desktop app once with 'mise run desktop'. It writes ${serverFileName}, which this task reads.`,
    );
  await ensureLanForwarderPortFree();
  const probe = await probeServer(file.url, file.token);
  if (probe === "answering") return runAgainstDesktopServer(file);
  if (probe === "refusing") {
    fail(
      `A server at ${file.url} rejects the token in ${serverFileName}. Restart the desktop app with 'mise run desktop'.`,
    );
  }
  await runAgainstStandaloneServer(
    file.storage ??
      fail(
        `${serverFileName} was written by an older desktop build and does not name its database and cache. Start the desktop app with 'mise run desktop' to rewrite it, quit it, and rerun this task.`,
      ),
  );
}

async function runAgainstDesktopServer(file: DesktopServerFile): Promise<void> {
  console.log(`Using the desktop app's server at ${file.url}.`);
  await serveWebApp(file);
}

async function runAgainstStandaloneServer(
  storage: DesktopStorage,
): Promise<void> {
  if ((await probeServer(standaloneServerUrl, "")) !== "absent") {
    fail(
      `A server already answers at ${standaloneServerUrl}, probably from another 'mise run web:desktop'. Stop it first.`,
    );
  }
  buildServer();
  const token = randomBytes(32).toString("hex");
  console.log(
    `The desktop app is not running, so a server on its database and cache starts at ${standaloneServerUrl}. Stop this task before starting the desktop app.`,
  );
  const serverEnv = {
    EASYIMMERSE_TOKEN: token,
    EASYIMMERSE_FFMPEG_DIR: ffmpegDir,
  };
  const server = spawnChild(
    {
      command: "cargo",
      args: standaloneServerCargoArgs(storage),
      env: serverEnv,
    },
    repositoryRoot,
  );
  await serveWebApp({ url: standaloneServerUrl, token }, [server]);
}

/** Builds before Vite starts, so that a compile error stops the task. */
function buildServer(): void {
  const build = spawnSync("cargo", ["build", "-p", "easyimmerse-server"], {
    cwd: repositoryRoot,
    stdio: "inherit",
  });
  if (build.status !== 0) fail("The server did not build.");
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}
