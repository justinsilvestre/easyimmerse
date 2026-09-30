import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { downloadToFile, verifySha256 } from "./download.ts";
import { extractArchive } from "./extract.ts";
import {
  hostTriple,
  type ManifestEntry,
  readManifestEntry,
} from "./manifest.ts";

/**
 * Downloads the pinned ffmpeg build for a target triple and places `ffmpeg` and
 * `ffprobe` where Tauri looks for sidecar binaries.
 *
 * Usage: `node scripts/fetch-ffmpeg/index.ts [triple] [--force]`
 */
const binaryNames = ["ffmpeg", "ffprobe"] as const;
const outputDir = fileURLToPath(
  new URL("../../apps/native/src-tauri/binaries/", import.meta.url),
);

await main(process.argv.slice(2));

async function main(args: string[]): Promise<void> {
  const force = args.includes("--force");
  const triple = args.find((arg) => !arg.startsWith("--")) ?? hostTriple();
  const outputs = binaryNames.map((name) => sidecarPath(name, triple));
  if (!force && outputs.every((path) => existsSync(path))) {
    console.log(
      `ffmpeg binaries for ${triple} already exist; pass --force to refetch`,
    );
    printPaths(outputs);
    return;
  }
  const entry = readManifestEntry(triple);
  await fetchIntoOutputDir(entry, triple);
  printPaths(outputs);
}

async function fetchIntoOutputDir(
  entry: ManifestEntry,
  triple: string,
): Promise<void> {
  const workDir = mkdtempSync(join(tmpdir(), "fetch-ffmpeg-"));
  try {
    const archive = join(workDir, `ffmpeg.${entry.archive}`);
    console.log(`downloading ${entry.url}`);
    await downloadToFile(entry.url, archive);
    await verifySha256(archive, entry.sha256);
    extractArchive(archive, entry.archive, workDir);
    for (const name of binaryNames) {
      installBinary(
        join(workDir, entry.paths[name]),
        sidecarPath(name, triple),
      );
    }
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
}

function installBinary(source: string, destination: string): void {
  mkdirSync(outputDir, { recursive: true });
  copyFileSync(source, destination);
  chmodSync(destination, 0o755);
}

/** Tauri names sidecars `<name>-<triple>`, with `.exe` appended for Windows targets. */
function sidecarPath(name: string, triple: string): string {
  const suffix = triple.includes("windows") ? ".exe" : "";
  return join(outputDir, `${name}-${triple}${suffix}`);
}

function printPaths(paths: string[]): void {
  for (const path of paths) {
    console.log(path);
  }
}
