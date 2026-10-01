import { describe, expect, it } from "vitest";
import {
  createTestMediaTracks,
  createTestTrack,
} from "./createTestMediaTracks.ts";
import {
  type BrowserMediaApis,
  measurePlaybackEnvironment,
} from "./measurePlaybackEnvironment.ts";

const frierenTracks = createTestMediaTracks([
  createTestTrack(0, "video", "avc1.64001F"),
  createTestTrack(1, "audio", "mp4a.6B"),
]);

/** Accepts H.264, AAC, and FLAC in fragmented MP4, as WebKit on macOS does. */
const webkitTypeCheck = (mimeType: string) =>
  [
    'video/mp4; codecs="avc1.64001F"',
    'audio/mp4; codecs="mp4a.40.2"',
    'audio/mp4; codecs="fLaC"',
  ].includes(mimeType);

function createBrowser(overrides: Partial<BrowserMediaApis>): BrowserMediaApis {
  return {
    userAgent: "AppleWebKit/605.1.15 (KHTML, like Gecko)",
    canPlayType: () => "",
    isTypeSupported: webkitTypeCheck,
    ...overrides,
  };
}

describe("measurePlaybackEnvironment", () => {
  it("reports the engine named by the user agent", () => {
    const browser = createBrowser({
      userAgent: "Gecko/20100101 Firefox/130.0",
    });
    expect(measurePlaybackEnvironment(frierenTracks, browser).engine).toBe(
      "gecko",
    );
  });

  it("checks the direct type with canPlayType", () => {
    const checkedTypes: string[] = [];
    const canPlayType = (mimeType: string) => {
      checkedTypes.push(mimeType);
      return "";
    };
    measurePlaybackEnvironment(frierenTracks, createBrowser({ canPlayType }));
    expect(checkedTypes).toEqual([frierenTracks.direct_type]);
  });

  it("reports direct play when canPlayType answers maybe", () => {
    const browser = createBrowser({ canPlayType: () => "maybe" });
    expect(measurePlaybackEnvironment(frierenTracks, browser).direct_play).toBe(
      true,
    );
  });

  it("reports no direct play when canPlayType answers with an empty string", () => {
    expect(
      measurePlaybackEnvironment(frierenTracks, createBrowser({})).direct_play,
    ).toBe(false);
  });

  it("lists the track and audio target codecs that the browser accepts in fragmented MP4", () => {
    expect(
      measurePlaybackEnvironment(frierenTracks, createBrowser({})).fmp4_codecs,
    ).toEqual(["avc1.64001F", "mp4a.40.2", "fLaC"]);
  });

  it("lists an accepted codec once when a track uses an audio target codec", () => {
    const aacTracks = createTestMediaTracks([
      createTestTrack(0, "audio", "mp4a.40.2"),
    ]);
    expect(
      measurePlaybackEnvironment(aacTracks, createBrowser({})).fmp4_codecs,
    ).toEqual(["mp4a.40.2", "fLaC"]);
  });

  it("checks audio codecs under the audio MIME type", () => {
    const checkedTypes: string[] = [];
    const isTypeSupported = (mimeType: string) => {
      checkedTypes.push(mimeType);
      return false;
    };
    measurePlaybackEnvironment(
      frierenTracks,
      createBrowser({ isTypeSupported }),
    );
    expect(checkedTypes).toContain('audio/mp4; codecs="mp4a.6B"');
  });

  it("skips tracks without a codec string", () => {
    const vorbisTracks = createTestMediaTracks([
      createTestTrack(0, "audio", null),
    ]);
    const checkedTypes: string[] = [];
    const isTypeSupported = (mimeType: string) => {
      checkedTypes.push(mimeType);
      return false;
    };
    measurePlaybackEnvironment(
      vorbisTracks,
      createBrowser({ isTypeSupported }),
    );
    expect(checkedTypes).toHaveLength(2);
  });

  it("lists no codecs when the browser has no Media Source Extensions", () => {
    const browser = createBrowser({ isTypeSupported: null });
    expect(
      measurePlaybackEnvironment(frierenTracks, browser).fmp4_codecs,
    ).toEqual([]);
  });
});
