import { describe, expect, it } from "vitest";
import { actions } from "../../app/appAction.ts";
import { initialMediaPanels, updateMediaPanels } from "./mediaPanels.ts";

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
});

describe("updateMediaPanels", () => {
  it("closes the subtitles panel when it is open", () => {
    expect(
      updateMediaPanels(initialMediaPanels, actions.cuePanelToggled()).cues,
    ).toBe(false);
  });

  it("shows the waveform when it is hidden", () => {
    expect(
      updateMediaPanels(initialMediaPanels, actions.waveformToggled()).waveform,
    ).toBe(true);
  });

  it("hides the waveform when it is shown", () => {
    expect(
      updateMediaPanels(
        { ...initialMediaPanels, waveform: true },
        actions.waveformToggled(),
      ).waveform,
    ).toBe(false);
  });

  it("cycles from both subtitles to the target language only", () => {
    expect(
      updateMediaPanels(initialMediaPanels, actions.subtitleDisplayCycled())
        .subtitleDisplay,
    ).toBe("target");
  });

  it("cycles from the translation back to both subtitles", () => {
    expect(
      updateMediaPanels(
        { ...initialMediaPanels, subtitleDisplay: "translation" },
        actions.subtitleDisplayCycled(),
      ).subtitleDisplay,
    ).toBe("both");
  });

  it("hides the subtitles over the stage when they are shown", () => {
    expect(
      updateMediaPanels(initialMediaPanels, actions.subtitlesToggled())
        .areSubtitlesHidden,
    ).toBe(true);
  });

  it("keeps the subtitle display when the subtitles are hidden", () => {
    expect(
      updateMediaPanels(
        { ...initialMediaPanels, subtitleDisplay: "target" },
        actions.subtitlesToggled(),
      ).subtitleDisplay,
    ).toBe("target");
  });

  it("keeps the panels as they are for other actions", () => {
    expect(
      updateMediaPanels(initialMediaPanels, actions.playerTimeChanged(3)),
    ).toBe(initialMediaPanels);
  });
});
