import { describe, expect, it } from "vitest";
import { initialMediaPanels, reduceMediaPanels } from "./mediaPanels.ts";

describe("initialMediaPanels", () => {
  it("opens the subtitles panel", () => {
    expect(initialMediaPanels.cues).toBe(true);
  });

  it("closes the waveform panel", () => {
    expect(initialMediaPanels.waveform).toBe(false);
  });

  it("shows the subtitles over the stage", () => {
    expect(initialMediaPanels.areSubtitlesHidden).toBe(false);
  });

  it("knows no distraction-free mode", () => {
    expect("distractionFree" in initialMediaPanels).toBe(false);
  });
});

describe("reduceMediaPanels", () => {
  it("closes the subtitles panel when it is open", () => {
    expect(
      reduceMediaPanels(initialMediaPanels, { type: "cuePanelToggled" }).cues,
    ).toBe(false);
  });

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

  it("hides the subtitles over the stage when they are shown", () => {
    expect(
      reduceMediaPanels(initialMediaPanels, { type: "subtitlesToggled" })
        .areSubtitlesHidden,
    ).toBe(true);
  });

  it("keeps the subtitle display when the subtitles are hidden", () => {
    expect(
      reduceMediaPanels(
        { ...initialMediaPanels, subtitleDisplay: "target" },
        { type: "subtitlesToggled" },
      ).subtitleDisplay,
    ).toBe("target");
  });
});
