import type { ConversionCapabilities } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import { isEncoderNoticeDue } from "./isEncoderNoticeDue.ts";

const withoutEncoder: ConversionCapabilities = {
  ffmpeg: { path: "/app/ffmpeg", version: "8.1.2", is_custom: false },
  encoder_discovery_finished: true,
  video_encoder: null,
};

const due = {
  capabilities: withoutEncoder,
  isDismissed: false,
  arePreferencesLoaded: true,
};

describe("isEncoderNoticeDue", () => {
  it("returns true when the bundled build found no encoder", () => {
    expect(isEncoderNoticeDue(due)).toBe(true);
  });

  it("returns false once the notice was put aside", () => {
    expect(isEncoderNoticeDue({ ...due, isDismissed: true })).toBe(false);
  });

  it("returns false until the preferences are read", () => {
    expect(isEncoderNoticeDue({ ...due, arePreferencesLoaded: false })).toBe(
      false,
    );
  });

  it("returns false while the encoders are still being tried", () => {
    expect(
      isEncoderNoticeDue({
        ...due,
        capabilities: { ...withoutEncoder, encoder_discovery_finished: false },
      }),
    ).toBe(false);
  });

  it("returns false when an encoder works", () => {
    expect(
      isEncoderNoticeDue({
        ...due,
        capabilities: {
          ...withoutEncoder,
          video_encoder: { name: "h264_videotoolbox", software: false },
        },
      }),
    ).toBe(false);
  });

  it("returns false for a build the person chose", () => {
    expect(
      isEncoderNoticeDue({
        ...due,
        capabilities: {
          ...withoutEncoder,
          ffmpeg: { path: "/usr/bin/ffmpeg", version: "7.1", is_custom: true },
        },
      }),
    ).toBe(false);
  });

  it("returns false before the capabilities arrive", () => {
    expect(isEncoderNoticeDue({ ...due, capabilities: undefined })).toBe(false);
  });
});
