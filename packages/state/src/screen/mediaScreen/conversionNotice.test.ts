import { describe, expect, it } from "vitest";
import { isConversionNoticeDue } from "./conversionNotice.ts";
import {
  exampleCopyPlayback,
  exampleTranscodePlayback,
} from "./examplePlayback.ts";

describe("isConversionNoticeDue", () => {
  it("is due for a method that re-encodes a track", () => {
    expect(isConversionNoticeDue(exampleTranscodePlayback, false)).toBe(true);
  });

  it("is not due once the notice is settled", () => {
    expect(isConversionNoticeDue(exampleTranscodePlayback, true)).toBe(false);
  });

  it("is not due for a method that only copies the tracks", () => {
    expect(isConversionNoticeDue(exampleCopyPlayback, false)).toBe(false);
  });

  it("is not due for a converting method that names no playlist", () => {
    const noPlaylist = { ...exampleTranscodePlayback, playlist_path: null };
    expect(isConversionNoticeDue(noPlaylist, false)).toBe(false);
  });

  it("is not due for a direct method", () => {
    const direct = { method: { kind: "direct" }, playlist_path: null } as const;
    expect(isConversionNoticeDue(direct, false)).toBe(false);
  });
});
