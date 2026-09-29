import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type MediaTool = "ffmpeg" | "ffprobe";

const toolsPathVariables: Record<MediaTool, string> = {
  ffmpeg: "EASYIMMERSE_FFMPEG_PATH",
  ffprobe: "EASYIMMERSE_FFPROBE_PATH",
};

/**
 * Runs ffmpeg or ffprobe and returns its standard output.
 * The executable is taken from the matching `EASYIMMERSE_*_PATH` environment variable,
 * or else looked up on the system path.
 */
export async function runMediaTool(
  tool: MediaTool,
  toolArguments: string[],
): Promise<string> {
  const { stdout } = await execFileAsync(resolveToolPath(tool), toolArguments);
  return stdout;
}

function resolveToolPath(tool: MediaTool): string {
  return process.env[toolsPathVariables[tool]] ?? tool;
}
