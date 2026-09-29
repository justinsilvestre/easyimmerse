import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runMediaTool } from "./runMediaTool.ts";

const sampleSubtitles = `1
00:00:00,200 --> 00:00:01,000
Guten Tag!

2
00:00:01,200 --> 00:00:01,900
Wie geht es dir?
`;

const generatedVideo = [
  "-f",
  "lavfi",
  "-i",
  "testsrc=duration=2:size=160x120:rate=10",
];
const generatedAudio = ["-f", "lavfi", "-i", "sine=frequency=440:duration=2"];
// These encoders are built into ffmpeg, so they are available in every ffmpeg distribution.
const encoders = ["-c:v", "mpeg4", "-c:a", "aac", "-c:s", "srt"];
const languages = [
  "-metadata:s:a:0",
  "language=deu",
  "-metadata:s:s:0",
  "language=deu",
];

/**
 * Creates a two-second video file with one video, one audio, and one subtitles track,
 * for use in tests. Returns the path of the file, which is inside a new temporary directory.
 */
export async function createSampleVideo(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "easyimmerse-media-"));
  const subtitlesPath = join(directory, "sample.srt");
  await writeFile(subtitlesPath, sampleSubtitles);
  const inputs = [...generatedVideo, ...generatedAudio, "-i", subtitlesPath];
  const videoPath = join(directory, "sample.mkv");
  await runMediaTool("ffmpeg", [
    "-y",
    ...inputs,
    ...encoders,
    ...languages,
    videoPath,
  ]);
  return videoPath;
}
