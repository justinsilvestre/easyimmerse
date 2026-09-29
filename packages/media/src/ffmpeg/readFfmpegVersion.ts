import { runMediaTool } from "./runMediaTool.ts";

/** Returns the version of the available ffmpeg executable, or `null` when ffmpeg cannot be run. */
export async function readFfmpegVersion(): Promise<string | null> {
  try {
    return parseVersion(await runMediaTool("ffmpeg", ["-version"]));
  } catch {
    return null;
  }
}

function parseVersion(versionOutput: string): string | null {
  return versionOutput.match(/^ffmpeg version (\S+)/)?.[1] ?? null;
}
