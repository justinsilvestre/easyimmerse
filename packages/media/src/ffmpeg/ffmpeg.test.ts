import { readFile, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseWebVtt } from "../subtitles/parseWebVtt.ts";
import { captureScreenshot } from "./captureScreenshot.ts";
import { clipAudio } from "./clipAudio.ts";
import { createSampleVideo } from "./createSampleVideo.ts";
import { extractSubtitles } from "./extractSubtitles.ts";
import { probeMediaTracks } from "./probeMediaTracks.ts";
import { readFfmpegVersion } from "./readFfmpegVersion.ts";

const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

async function createOutputPath(videoPath: string, fileName: string) {
  return join(dirname(videoPath), fileName);
}

describe("readFfmpegVersion", () => {
  it("finds the installed ffmpeg", async () => {
    expect(await readFfmpegVersion()).toEqual(expect.any(String));
  });
});

describe("probeMediaTracks", () => {
  it("lists the tracks of a video file", async () => {
    const tracks = await probeMediaTracks(await createSampleVideo());
    expect(tracks.map((track) => track.type)).toEqual([
      "video",
      "audio",
      "subtitle",
    ]);
  });

  it("reads the languages of tracks", async () => {
    const tracks = await probeMediaTracks(await createSampleVideo());
    expect(tracks[1]?.language).toBe("deu");
  });
});

describe("clipAudio", () => {
  it("writes an audio file containing only an audio track", async () => {
    const videoPath = await createSampleVideo();
    const clipPath = await createOutputPath(videoPath, "clip.mp3");
    await clipAudio(videoPath, clipPath, { startSeconds: 0.2, endSeconds: 1 });
    const tracks = await probeMediaTracks(clipPath);
    expect(tracks.map((track) => track.type)).toEqual(["audio"]);
  });
});

describe("captureScreenshot", () => {
  it("writes an image file", async () => {
    const videoPath = await createSampleVideo();
    const screenshotPath = await createOutputPath(videoPath, "screenshot.png");
    await captureScreenshot(videoPath, screenshotPath, 0.5);
    const screenshot = await readFile(screenshotPath);
    expect(screenshot.subarray(0, 4)).toEqual(pngSignature);
  });
});

describe("extractSubtitles", () => {
  it("writes a subtitles file readable as WebVTT", async () => {
    const videoPath = await createSampleVideo();
    const subtitlesPath = await createOutputPath(videoPath, "subtitles.vtt");
    await extractSubtitles(videoPath, subtitlesPath, 2);
    const cues = parseWebVtt(await readFile(subtitlesPath, "utf8"));
    expect(cues.map((cue) => cue.text)).toEqual([
      "Guten Tag!",
      "Wie geht es dir?",
    ]);
  });

  it("writes a non-empty file", async () => {
    const videoPath = await createSampleVideo();
    const subtitlesPath = await createOutputPath(videoPath, "subtitles.vtt");
    await extractSubtitles(videoPath, subtitlesPath, 2);
    expect((await stat(subtitlesPath)).size).toBeGreaterThan(0);
  });
});
