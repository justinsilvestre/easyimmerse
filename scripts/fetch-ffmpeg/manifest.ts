import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export type ArchiveKind = "tar.xz" | "zip";

/** One downloadable ffmpeg build, keyed in the manifest by its Rust target triple. */
export interface ManifestEntry {
  url: string;
  /** Hex SHA-256 of the archive, or a string starting with `TODO` while unknown. */
  sha256: string;
  archive: ArchiveKind;
  /** Locations of the two binaries inside the archive. */
  paths: { ffmpeg: string; ffprobe: string };
}

const manifestPath = fileURLToPath(new URL("manifest.json", import.meta.url));

/** Returns the manifest entry for the triple, or throws with a message naming the problem. */
export function readManifestEntry(triple: string): ManifestEntry {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf-8")) as Record<
    string,
    ManifestEntry
  >;
  const entry = manifest[triple];
  if (!entry) {
    const known = Object.keys(manifest).join(", ");
    throw new Error(
      `no ffmpeg build is listed for ${triple} (known: ${known})`,
    );
  }
  if (entry.sha256.startsWith("TODO")) {
    throw new Error(
      `the ffmpeg build for ${triple} has no hash yet: ${entry.sha256}`,
    );
  }
  return entry;
}

/** Asks rustc for the target triple of the machine running this script. */
export function hostTriple(): string {
  return execFileSync("rustc", ["--print", "host-tuple"], {
    encoding: "utf-8",
  }).trim();
}
