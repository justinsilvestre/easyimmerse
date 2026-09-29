import { runMediaTool } from "./runMediaTool.ts";

/**
 * Writes the video frame shown at the given time to an image file.
 * The image format is determined by the extension of the output path.
 */
export async function captureScreenshot(
  inputPath: string,
  outputPath: string,
  atSeconds: number,
): Promise<void> {
  const seek = ["-ss", `${atSeconds}`];
  const singleFrame = ["-frames:v", "1", "-update", "1"];
  await runMediaTool("ffmpeg", [
    "-y",
    ...seek,
    "-i",
    inputPath,
    ...singleFrame,
    outputPath,
  ]);
}
