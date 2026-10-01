import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { fixturePath } from "@easyimmerse/fixtures";
import { interiorSeekTime } from "@easyimmerse/state";
import type {
  MediaFile,
  MediaTracks,
  PlaybackResponse,
  Project,
} from "@easyimmerse/types";
import {
  type APIRequestContext,
  type APIResponse,
  expect,
  type Page,
  request,
  test,
} from "@playwright/test";
import { serverToken, serverUrl } from "./e2eServer.ts";

/**
 * Frames of conversion.mkv to seek to, latest first so that the server restarts its conversion for each.
 * They include the first frame of every segment, where the output of two conversion runs meets, and frames between keyframes.
 */
const seekFrames = [
  575, 559, 500, 463, 432, 400, 336, 310, 269, 200, 173, 147, 100, 65, 50, 36,
];

// Chromium treats a page that the test itself serves as public, so the page needs permission to reach the server on the loopback address.
test.use({ permissions: ["local-network-access"] });

test("direct and converted playback show the frame that starts at a cue when seeking to the cue", async ({
  page,
}) => {
  const api = await request.newContext({
    baseURL: serverUrl,
    extraHTTPHeaders: { Authorization: `Bearer ${serverToken}` },
  });
  const stream = await convertFixture(api);
  await api.dispose();
  test.skip(
    stream === null,
    "the server cannot convert media: ffmpeg or its cache directory is missing",
  );
  if (stream === null) return;
  await openHarness(page, stream.playlistUrl);
  const shown = [];
  for (const frame of seekFrames) {
    const seconds =
      interiorSeekTime(frameStartMs(frame), stream.frameDurationMs) / 1000;
    shown.push({
      frame,
      direct: await frameShownAt(page, "direct", seconds),
      converted: await frameShownAt(page, "converted", seconds),
    });
  }
  expect(shown).toEqual(
    seekFrames.map((frame) => ({ frame, direct: frame, converted: frame })),
  );
});

/** Returns the start of a frame of conversion.mkv, which stores each frame's time rounded to the millisecond. */
function frameStartMs(frame: number): number {
  return Math.round((frame * 1001) / 24);
}

/** Adds conversion.mkv to a new project and asks the server to convert it, or returns null when the server cannot. */
async function convertFixture(
  api: APIRequestContext,
): Promise<{ playlistUrl: string; frameDurationMs: number } | null> {
  const project: Project = await post(api, "/projects", {
    name: "Seek accuracy",
    target_language: "en",
    translation_language: "de",
    flashcard_settings: {
      included_fields: [],
      default_tags: [],
      tag_with_media_name: false,
      use_tts_when_no_audio: false,
    },
  });
  const media: MediaFile = await post(api, `/projects/${project.id}/media`, {
    name: "conversion.mkv",
    kind: "video",
    source: { kind: "path", path: fixturePath("conversion.mkv") },
  });
  const mediaPath = `/projects/${project.id}/media/${media.id}`;
  const tracks: MediaTracks = await readJson(api.get(`${mediaPath}/tracks`));
  const playback: PlaybackResponse = await post(api, `${mediaPath}/playback`, {
    environment: {
      engine: "chromium",
      direct_play: false,
      fmp4_codecs: [videoCodecString(tracks), "mp4a.40.2"],
    },
  });
  if (playback.playlist_path === null) return null;
  return {
    playlistUrl: `${serverUrl}${playback.playlist_path}`,
    frameDurationMs: frameDurationMs(tracks),
  };
}

function post<T>(
  api: APIRequestContext,
  path: string,
  body: unknown,
): Promise<T> {
  return readJson(api.post(path, { data: body }));
}

async function readJson<T>(pending: Promise<APIResponse>): Promise<T> {
  const response = await pending;
  if (response.status() === 403)
    throw new Error(
      "The API server on port 8787 may not read local paths. Stop it so that Playwright starts one with --allow-local-paths.",
    );
  if (!response.ok()) throw new Error(await response.text());
  return response.json();
}

function videoCodecString(tracks: MediaTracks): string {
  const codecString = findVideoTrack(tracks)?.codec_string;
  if (!codecString) throw new Error("conversion.mkv has a video codec string");
  return codecString;
}

function frameDurationMs(tracks: MediaTracks): number {
  const frameRate = findVideoTrack(tracks)?.video?.frame_rate;
  if (!frameRate) throw new Error("conversion.mkv has a known frame rate");
  return (frameRate.denominator * 1000) / frameRate.numerator;
}

function findVideoTrack(tracks: MediaTracks) {
  return tracks.container.tracks.find((track) => track.kind === "video");
}

/** Opens a page that plays the fixture directly and as the converted stream, served from the app's origin. */
async function openHarness(page: Page, playlistUrl: string): Promise<void> {
  const files: Record<string, { path: string; contentType: string }> = {
    "": {
      path: fileURLToPath(new URL("seekHarness.html", import.meta.url)),
      contentType: "text/html",
    },
    "hls.js": { path: hlsScriptPath(), contentType: "text/javascript" },
    "source.mkv": {
      path: fixturePath("conversion.mkv"),
      contentType: "video/x-matroska",
    },
  };
  await page.route("**/seek-harness/*", (route) => {
    const name = new URL(route.request().url()).pathname.split("/").pop() ?? "";
    const file = files[name];
    if (file === undefined) return route.fulfill({ status: 404 });
    return route.fulfill({
      body: readFileSync(file.path),
      contentType: file.contentType,
    });
  });
  await page.goto("/seek-harness/");
  await page.evaluate(() => window.attachDirect());
  await page.evaluate(({ url, token }) => window.attachConverted(url, token), {
    url: playlistUrl,
    token: serverToken,
  });
}

/** Finds hls.js where the UI package, which plays converted streams with it, depends on it. */
function hlsScriptPath(): string {
  const uiPackage = new URL(
    "../../../packages/ui/package.json",
    import.meta.url,
  );
  return createRequire(uiPackage).resolve("hls.js/dist/hls.js");
}

function frameShownAt(
  page: Page,
  videoId: string,
  seconds: number,
): Promise<number> {
  return page.evaluate(
    ({ videoId, seconds }) => window.frameShownAt(videoId, seconds),
    { videoId, seconds },
  );
}

declare global {
  interface Window {
    attachDirect(): Promise<void>;
    attachConverted(playlistUrl: string, token: string): Promise<void>;
    frameShownAt(videoId: string, seconds: number): Promise<number>;
  }
}
