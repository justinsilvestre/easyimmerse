import { existsSync, mkdirSync, rmSync, symlinkSync } from "node:fs";
import { join } from "node:path";

const binaryNames = ["ffmpeg", "ffprobe"] as const;

/**
 * Links the Tauri sidecars, named `<binary>-<triple>`, into a directory under their plain names,
 * which is how the server finds them through `EASYIMMERSE_FFMPEG_DIR`.
 * Returns the names of the sidecars that are missing, linking nothing when any is.
 */
export function linkFfmpegSidecars(
  sidecarDir: string,
  linkDir: string,
  triple: string,
): string[] {
  const sidecars = binaryNames.map((name) => ({
    name,
    path: join(sidecarDir, `${name}-${triple}`),
  }));
  const missing = sidecars.filter((sidecar) => !existsSync(sidecar.path));
  if (missing.length > 0) return missing.map((sidecar) => sidecar.path);
  mkdirSync(linkDir, { recursive: true });
  for (const sidecar of sidecars) {
    const link = join(linkDir, sidecar.name);
    rmSync(link, { force: true });
    symlinkSync(sidecar.path, link);
  }
  return [];
}
