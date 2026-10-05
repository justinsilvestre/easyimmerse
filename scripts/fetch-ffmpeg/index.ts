import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { downloadToFile, verifySha256 } from "./download.ts";
import { extractArchive } from "./extract.ts";
import { formatInstallStamp, isInstalled } from "./installStamp.ts";
import {
  hostTriple,
  type ManifestEntry,
  readManifestEntry,
} from "./manifest.ts";

/**
 * Downloads the pinned ffmpeg build for a target triple and places its `ffmpeg` and
 * `ffprobe` where Tauri looks for sidecar binaries.
 * A stamp beside them records the release and archive hash installed,
 * so the download is skipped only while both binaries exist and the stamp matches the manifest.
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
  const entry = readManifestEntry(triple);
  const outputs = binaryNames.map((name) => sidecarPath(name, triple));
  if (!force && isCurrent(entry, triple, outputs)) {
    console.log(
      `ffmpeg binaries for ${triple} from ${entry.release} already exist; pass --force to refetch`,
    );
    printPaths(outputs);
    return;
  }
  await fetchIntoOutputDir(entry, triple);
  printPaths(outputs);
}

function isCurrent(
  entry: ManifestEntry,
  triple: string,
  outputs: string[],
): boolean {
  const stampPath = installStampPath(triple);
  const stampText = existsSync(stampPath)
    ? readFileSync(stampPath, "utf-8")
    : null;
  return (
    outputs.every((path) => existsSync(path)) && isInstalled(entry, stampText)
  );
}

async function fetchIntoOutputDir(
  entry: ManifestEntry,
  triple: string,
): Promise<void> {
  const workDir = mkdtempSync(join(tmpdir(), "fetch-ffmpeg-"));
  rmSync(installStampPath(triple), { force: true });
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
    writeFileSync(installStampPath(triple), formatInstallStamp(entry));
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
}

function installBinary(source: string, destination: string): void {
  mkdirSync(outputDir, { recursive: true });
  copyFileSync(source, destination);
  chmodSync(destination, 0o755);
}

/**
 * Tauri expects sidecars named `<name>-<triple>`, with `.exe` appended for Windows targets.
 * The `easyimmerse-` prefix keeps the installed binaries from colliding with a system ffmpeg,
 * since the Linux packages install sidecars into `/usr/bin`.
 */
function sidecarPath(name: string, triple: string): string {
  const suffix = triple.includes("windows") ? ".exe" : "";
  return join(outputDir, `easyimmerse-${name}-${triple}${suffix}`);
}

/** The stamp's name matches no `externalBin` entry, so Tauri does not bundle it. */
function installStampPath(triple: string): string {
  return join(outputDir, `fetch-ffmpeg-${triple}.json`);
}

function printPaths(paths: string[]): void {
  for (const path of paths) {
    console.log(path);
  }
}
