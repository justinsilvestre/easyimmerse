import { execFileSync } from "node:child_process";
import { cp, mkdir, rm } from "node:fs/promises";

/**
 * Prepares the files that let the desktop app run the API server:
 * a copy of the Node executable, and the bundled server with its database migrations.
 * The server must be built before running this script.
 */

const binariesFolder = "src-tauri/binaries";
const serverFolder = "src-tauri/resources/server";
const executableExtension = process.platform === "win32" ? ".exe" : "";

/** Tauri requires the names of bundled executables to end with the identifier of the build target. */
function readBuildTarget(): string {
  const compilerInfo = execFileSync("rustc", ["-vV"], { encoding: "utf8" });
  const target = compilerInfo.match(/^host: (\S+)$/m)?.[1];
  if (!target) throw new Error("The build target could not be determined.");
  return process.env.EASYIMMERSE_BUILD_TARGET ?? target;
}

async function recreateFolder(folder: string) {
  await rm(folder, { recursive: true, force: true });
  await mkdir(folder, { recursive: true });
}

await recreateFolder(binariesFolder);
await cp(
  process.execPath,
  `${binariesFolder}/node-${readBuildTarget()}${executableExtension}`,
);

await recreateFolder(serverFolder);
await cp("../server/dist", serverFolder, { recursive: true });
