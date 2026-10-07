import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";

const binaryNames = ["ffmpeg", "ffprobe"] as const;
const profiles = ["debug", "release"] as const;

/**
 * Removes the copies of the sidecars that Tauri's build script placed in Cargo's target folder,
 * and returns their paths.
 * A refetch changes the sidecars' source files, so the next build copies them again,
 * while a debug app launched without a rebuild no longer runs the old binaries.
 */
export function removeSidecarCopies(
  targetDir: string,
  triple: string,
): string[] {
  const suffix = triple.includes("windows") ? ".exe" : "";
  const copies = profiles.flatMap((profile) =>
    binaryNames.map((name) =>
      join(targetDir, profile, `easyimmerse-${name}${suffix}`),
    ),
  );
  const existing = copies.filter((path) => existsSync(path));
  for (const path of existing) rmSync(path);
  return existing;
}
