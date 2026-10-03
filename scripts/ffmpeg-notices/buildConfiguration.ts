import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { basename, join } from "node:path";

import {
  downloadToFile,
  sha256OfFile,
  verifySha256,
} from "../fetch-ffmpeg/download.ts";
import type { ManifestEntry } from "../fetch-ffmpeg/manifest.ts";
import { findConfigureLine } from "./configureLine.ts";

/**
 * Reads the configure line of a manifest entry's ffmpeg binary. Archives are kept in the
 * cache directory and downloaded again only when missing or when their hash differs.
 */
export async function readBuildConfiguration(
  entry: ManifestEntry,
  cacheDir: string,
): Promise<string> {
  const archive = await cachedArchive(entry, cacheDir);
  const workDir = mkdtempSync(join(cacheDir, "extract-"));
  try {
    extractMember(archive, entry, workDir);
    const configuration = findConfigureLine(
      readFileSync(join(workDir, entry.paths.ffmpeg)),
    );
    if (!configuration)
      throw new Error(`no configure line found in ${entry.url}`);
    return configuration;
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
}

async function cachedArchive(
  entry: ManifestEntry,
  cacheDir: string,
): Promise<string> {
  mkdirSync(cacheDir, { recursive: true });
  const archive = join(cacheDir, basename(new URL(entry.url).pathname));
  if (!existsSync(archive) || (await sha256OfFile(archive)) !== entry.sha256) {
    console.log(`downloading ${entry.url}`);
    await downloadToFile(entry.url, archive);
  }
  await verifySha256(archive, entry.sha256);
  return archive;
}

function extractMember(
  archive: string,
  entry: ManifestEntry,
  destinationDir: string,
): void {
  const member = entry.paths.ffmpeg;
  if (entry.archive === "tar.xz") {
    execFileSync("tar", ["-xJf", archive, "-C", destinationDir, member]);
  } else {
    execFileSync("unzip", ["-q", archive, member, "-d", destinationDir]);
  }
}
