import type { ManifestEntry } from "./manifest.ts";

/** The release and archive hash of the ffmpeg build installed for a target, as recorded beside its binaries. */
interface InstallStamp {
  release: string;
  sha256: string;
}

/** Returns the stamp to record once the entry's binaries are installed. */
export function formatInstallStamp(entry: ManifestEntry): string {
  const stamp: InstallStamp = { release: entry.release, sha256: entry.sha256 };
  return `${JSON.stringify(stamp, null, 2)}\n`;
}

/** Whether the stamp, or its absence as null, says that the entry's build is the one installed. */
export function isInstalled(
  entry: ManifestEntry,
  stampText: string | null,
): boolean {
  const stamp = parseInstallStamp(stampText);
  return stamp?.release === entry.release && stamp.sha256 === entry.sha256;
}

function parseInstallStamp(text: string | null): Partial<InstallStamp> | null {
  if (text === null) return null;
  try {
    return JSON.parse(text) as Partial<InstallStamp>;
  } catch {
    return null;
  }
}
