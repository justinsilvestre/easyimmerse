import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export type ArchiveKind = "tar.xz" | "zip";

/** The pinned release of this repository's ffmpeg workflow, as `manifest.json` stores it. */
export interface Manifest {
  /** The GitHub repository that publishes the release, as `owner/name`. */
  repository: string;
  /** The release tag: `ffmpeg-<version>`, or `ffmpeg-<version>-<n>` for a rebuild. */
  release: string;
  /** Hex SHA-256 of each target's archive, keyed by Rust target triple. */
  sha256: Record<string, string>;
}

/** One downloadable ffmpeg build, keyed in the manifest by its Rust target triple. */
export interface ManifestEntry {
  url: string;
  /** Hex SHA-256 of the archive. */
  sha256: string;
  archive: ArchiveKind;
  /** Locations of the two binaries inside the archive. */
  paths: { ffmpeg: string; ffprobe: string };
}

const manifestPath = fileURLToPath(new URL("manifest.json", import.meta.url));

/** Returns every manifest entry, keyed by target triple. */
export function readManifest(): Record<string, ManifestEntry> {
  return deriveManifestEntries(JSON.parse(readFileSync(manifestPath, "utf-8")));
}

/** Returns the manifest entry for the triple, or throws with a message naming the problem. */
export function readManifestEntry(triple: string): ManifestEntry {
  const manifest = readManifest();
  const entry = manifest[triple];
  if (!entry) {
    const known = Object.keys(manifest).join(", ");
    throw new Error(
      `no ffmpeg build is listed for ${triple} (known: ${known})`,
    );
  }
  return entry;
}

/** Expands the manifest into one entry per target triple, using the workflow's asset names. */
export function deriveManifestEntries(
  manifest: Manifest,
): Record<string, ManifestEntry> {
  const version = readReleaseVersion(manifest.release);
  const releaseUrl = `https://github.com/${manifest.repository}/releases/download/${manifest.release}`;
  return Object.fromEntries(
    Object.entries(manifest.sha256).map(([triple, sha256]) => {
      const isWindows = triple.includes("windows");
      const archive: ArchiveKind = isWindows ? "zip" : "tar.xz";
      const extension = isWindows ? ".exe" : "";
      const entry: ManifestEntry = {
        url: `${releaseUrl}/ffmpeg-${version}-${triple}.${archive}`,
        sha256,
        archive,
        paths: { ffmpeg: `ffmpeg${extension}`, ffprobe: `ffprobe${extension}` },
      };
      return [triple, entry];
    }),
  );
}

function readReleaseVersion(release: string): string {
  const [, version] = /^ffmpeg-([\d.]+)(?:-\d+)?$/.exec(release) ?? [];
  if (!version) {
    throw new Error(
      `the release ${release} is not named ffmpeg-<version> or ffmpeg-<version>-<n>`,
    );
  }
  return version;
}

/** Asks rustc for the target triple of the machine running this script. */
export function hostTriple(): string {
  return execFileSync("rustc", ["--print", "host-tuple"], {
    encoding: "utf-8",
  }).trim();
}
