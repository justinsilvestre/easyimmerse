import { describe, expect, it } from "vitest";
import { initialMediaPanels, reduceMediaPanels } from "./mediaPanels.ts";

describe("initialMediaPanels", () => {
  it("opens the subtitles panel", () => {
    expect(initialMediaPanels.cues).toBe(true);
  });

  it("closes the waveform panel", () => {
    expect(initialMediaPanels.waveform).toBe(false);
  });
});

describe("reduceMediaPanels", () => {
  it("shows the waveform when it is hidden", () => {
    expect(
      reduceMediaPanels(initialMediaPanels, { type: "waveformToggled" })
        .waveform,
    ).toBe(true);
  });

  it("hides the waveform when it is shown", () => {
    expect(
      reduceMediaPanels(
        { ...initialMediaPanels, waveform: true },
        { type: "waveformToggled" },
      ).waveform,
    ).toBe(false);
  });

  it("cycles from both subtitles to the target language only", () => {
    expect(
      reduceMediaPanels(initialMediaPanels, { type: "subtitleDisplayCycled" })
        .subtitleDisplay,
    ).toBe("target");
  });

  it("cycles from the translation back to both subtitles", () => {
    expect(
      reduceMediaPanels(
        { ...initialMediaPanels, subtitleDisplay: "translation" },
        { type: "subtitleDisplayCycled" },
      ).subtitleDisplay,
    ).toBe("both");
  });
});
