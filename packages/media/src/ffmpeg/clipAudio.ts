import { runMediaTool } from "./runMediaTool.ts";

export type TimeRange = {
  startSeconds: number;
  endSeconds: number;
};

/**
 * Writes the audio within the given time range to a new file.
 * The audio format is determined by the extension of the output path.
 */
export async function clipAudio(
  inputPath: string,
  outputPath: string,
  timeRange: TimeRange,
): Promise<void> {
  const range = [
    "-ss",
    `${timeRange.startSeconds}`,
    "-to",
    `${timeRange.endSeconds}`,
  ];
  await runMediaTool("ffmpeg", [
    "-y",
    "-i",
    inputPath,
    ...range,
    "-vn",
    outputPath,
  ]);
}
