import { runMediaTool } from "./runMediaTool.ts";

/**
 * Writes one subtitles track of a media file to a separate subtitles file.
 * The subtitles format is determined by the extension of the output path.
 *
 * @param trackIndex The index of the track among all tracks of the media file.
 */
export async function extractSubtitles(
  inputPath: string,
  outputPath: string,
  trackIndex: number,
): Promise<void> {
  const track = ["-map", `0:${trackIndex}`];
  await runMediaTool("ffmpeg", ["-y", "-i", inputPath, ...track, outputPath]);
}
