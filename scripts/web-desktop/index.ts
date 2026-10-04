import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { hostTriple } from "../fetch-ffmpeg/manifest.ts";
import {
  type DesktopServerFile,
  type DesktopStorage,
  readDesktopServerFile,
} from "./desktopServerFile.ts";
import { linkFfmpegSidecars } from "./ffmpegLinks.ts";
import { probeServer } from "./probeServer.ts";
import { type ChildCommand, runTogether } from "./runTogether.ts";
import {
  standaloneServerCargoArgs,
  standaloneServerUrl,
} from "./standaloneServer.ts";

/**
 * Runs the web app against the desktop app's embedded server, or, when the desktop app is not
 * running, against a standalone server on the desktop app's database and cache.
 *
 * Usage: `node scripts/web-desktop/index.ts`
 */
const repositoryRoot = fileURLToPath(new URL("../../", import.meta.url));
const serverFileName = ".dev/desktop-server.env";

await main();

async function main(): Promise<void> {
  const file =
    readDesktopServerFile(join(repositoryRoot, serverFileName)) ??
    fail(
      `Start the desktop app once with 'mise run desktop'. It writes ${serverFileName}, which this task reads.`,
    );
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

function runAgainstDesktopServer(file: DesktopServerFile): void {
  console.log(`Using the desktop app's server at ${file.url}.`);
  runTogether([viteCommand(file.url, file.token)], repositoryRoot);
}

async function runAgainstStandaloneServer(
  storage: DesktopStorage,
): Promise<void> {
  if ((await probeServer(standaloneServerUrl, "")) !== "absent") {
    fail(
      `A server already answers at ${standaloneServerUrl}, probably from another 'mise run web:desktop'. Stop it first.`,
    );
  }
  const ffmpegDir = linkFfmpeg();
  buildServer();
  const token = randomBytes(32).toString("hex");
  console.log(
    `The desktop app is not running, so a server on its database and cache starts at ${standaloneServerUrl}. Stop this task before starting the desktop app.`,
  );
  const serverEnv = {
    EASYIMMERSE_TOKEN: token,
    EASYIMMERSE_FFMPEG_DIR: ffmpegDir,
  };
  const server = {
    command: "cargo",
    args: standaloneServerCargoArgs(storage),
    env: serverEnv,
  };
  runTogether(
    [server, viteCommand(standaloneServerUrl, token)],
    repositoryRoot,
  );
}

function linkFfmpeg(): string {
  const sidecarDir = join(repositoryRoot, "apps/native/src-tauri/binaries");
  const linkDir = join(repositoryRoot, ".dev/ffmpeg");
  const missing = linkFfmpegSidecars(sidecarDir, linkDir, hostTriple());
  if (missing.length > 0) {
    fail(
      `ffmpeg is missing (${missing.join(", ")}). Run 'mise run fetch-ffmpeg'.`,
    );
  }
  return linkDir;
}

/** Builds before Vite starts, so that a compile error stops the task. */
function buildServer(): void {
  const build = spawnSync("cargo", ["build", "-p", "easyimmerse-server"], {
    cwd: repositoryRoot,
    stdio: "inherit",
  });
  if (build.status !== 0) fail("The server did not build.");
}

function viteCommand(serverUrl: string, token: string): ChildCommand {
  return {
    command: "pnpm",
    args: ["--filter", "@easyimmerse/web", "dev"],
    env: {
      VITE_EASYIMMERSE_SERVER_URL: serverUrl,
      VITE_EASYIMMERSE_TOKEN: token,
    },
  };
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}
