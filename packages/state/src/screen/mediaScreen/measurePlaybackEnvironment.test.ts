import { describe, expect, it } from "vitest";
import type { PlaybackProbes } from "../../platform/effects.ts";
import {
  detectEngine,
  measurePlaybackEnvironment,
} from "./measurePlaybackEnvironment.ts";

const safariUserAgent =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15";
const chromeUserAgent =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const edgeUserAgent = `${chromeUserAgent} Edg/124.0.0.0`;
const firefoxUserAgent =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:125.0) Gecko/20100101 Firefox/125.0";
const webviewUserAgent =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko)";

function probes(overrides: Partial<PlaybackProbes> = {}): PlaybackProbes {
  return {
    userAgent: safariUserAgent,
    canPlayType: () => "probably",
    isTypeSupported: (mimeType) => !mimeType.includes("fLaC"),
    ...overrides,
  };
}

const mkvMimeType = 'video/x-matroska; codecs="avc1.64001F, mp4a.40.2"';

describe("detectEngine", () => {
  it("recognizes Safari as WebKit", () => {
    expect(detectEngine(safariUserAgent)).toBe("webkit");
  });

  it("recognizes a bare WebKit webview as WebKit", () => {
    expect(detectEngine(webviewUserAgent)).toBe("webkit");
  });

  it("recognizes Chrome as Chromium", () => {
    expect(detectEngine(chromeUserAgent)).toBe("chromium");
  });

  it("recognizes Edge as Chromium", () => {
    expect(detectEngine(edgeUserAgent)).toBe("chromium");
  });

  it("recognizes Firefox as Gecko", () => {
    expect(detectEngine(firefoxUserAgent)).toBe("gecko");
  });
});

describe("measurePlaybackEnvironment", () => {
  it("reports the engine of the user agent", () => {
    const environment = measurePlaybackEnvironment(mkvMimeType, [], probes());
    expect(environment.engine).toBe("webkit");
  });

  it("reports probably when the element can probably play the file", () => {
    const environment = measurePlaybackEnvironment(mkvMimeType, [], probes());
    expect(environment.can_play_type).toBe("probably");
  });

  it("reports maybe when the element answers maybe", () => {
    const environment = measurePlaybackEnvironment(
      mkvMimeType,
      [],
      probes({ canPlayType: () => "maybe" }),
    );
    expect(environment.can_play_type).toBe("maybe");
  });

  it("reports no when the element answers with an empty string", () => {
    const environment = measurePlaybackEnvironment(
      mkvMimeType,
      [],
      probes({ canPlayType: () => "" }),
    );
    expect(environment.can_play_type).toBe("no");
  });

  it("reports no without asking when the file has no direct MIME type", () => {
    const environment = measurePlaybackEnvironment(
      null,
      [],
      probes({
        canPlayType: () => {
          throw new Error("must not be called");
        },
      }),
    );
    expect(environment.can_play_type).toBe("no");
  });

  it("lists the file's codec strings that MSE accepts", () => {
    const environment = measurePlaybackEnvironment(
      mkvMimeType,
      ["avc1.64001F", "ac-3"],
      probes({ isTypeSupported: (mimeType) => mimeType.includes("avc1") }),
    );
    expect(environment.mse_codec_strings).toEqual([
      "avc1.64001F",
      "avc1.640033",
    ]);
  });

  it("always tests the conversion targets", () => {
    const environment = measurePlaybackEnvironment(mkvMimeType, [], probes());
    expect(environment.mse_codec_strings).toEqual(["mp4a.40.2", "avc1.640033"]);
  });

  it("accepts a codec that only audio/mp4 supports", () => {
    const environment = measurePlaybackEnvironment(
      mkvMimeType,
      [],
      probes({
        isTypeSupported: (mimeType) => mimeType === 'audio/mp4; codecs="fLaC"',
      }),
    );
    expect(environment.mse_codec_strings).toEqual(["fLaC"]);
  });

  it("lists a codec once when the file repeats a target", () => {
    const environment = measurePlaybackEnvironment(
      mkvMimeType,
      ["mp4a.40.2", "mp4a.40.2"],
      probes({ isTypeSupported: () => true }),
    );
    expect(environment.mse_codec_strings).toEqual([
      "mp4a.40.2",
      "fLaC",
      "avc1.640033",
    ]);
  });

  it("lists no codec strings without MSE", () => {
    const environment = measurePlaybackEnvironment(
      mkvMimeType,
      ["avc1.64001F"],
      probes({ isTypeSupported: null }),
    );
    expect(environment.mse_codec_strings).toEqual([]);
  });

  describe("in Chromium", () => {
    it("reports the chromium engine", () => {
      const environment = measurePlaybackEnvironment(
        mkvMimeType,
        [],
        probes({ userAgent: chromeUserAgent }),
      );
      expect(environment.engine).toBe("chromium");
    });
  });

  describe("in Gecko", () => {
    it("reports the gecko engine", () => {
      const environment = measurePlaybackEnvironment(
        mkvMimeType,
        [],
        probes({ userAgent: firefoxUserAgent }),
      );
      expect(environment.engine).toBe("gecko");
    });
  });
});
