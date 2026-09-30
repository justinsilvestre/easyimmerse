import { execFileSync } from "node:child_process";

import type { ArchiveKind } from "./manifest.ts";

/** Unpacks the archive into the directory with the tools the host system provides. */
export function extractArchive(
  archive: string,
  kind: ArchiveKind,
  destinationDir: string,
): void {
  if (kind === "tar.xz") {
    execFileSync("tar", ["-xf", archive, "-C", destinationDir], {
      stdio: "inherit",
    });
  } else {
    extractZip(archive, destinationDir);
  }
}

function extractZip(archive: string, destinationDir: string): void {
  if (process.platform === "win32") {
    const command = `Expand-Archive -LiteralPath '${archive}' -DestinationPath '${destinationDir}' -Force`;
    execFileSync("powershell", ["-NoProfile", "-Command", command], {
      stdio: "inherit",
    });
  } else {
    execFileSync("unzip", ["-q", archive, "-d", destinationDir], {
      stdio: "inherit",
    });
  }
}
