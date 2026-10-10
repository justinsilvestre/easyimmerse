import { describe, expect, it } from "vitest";
import { actions } from "../../app/appAction.ts";
import { openWithClip } from "../../flashcards/exampleFlashcards.ts";
import { initialMediaPanels } from "./mediaPanels.ts";
import {
  applyToMediaScreen as apply,
  applyToMediaScreenIn,
  mediaScreenAfter,
} from "./mediaScreenTestSupport.ts";

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

describe("updateMediaScreen", () => {
  describe("for the panels", () => {
    it("closes the subtitles panel when it is open", () => {
      const [screen] = apply(actions.cuePanelToggled());
      expect(screen.panels.cues).toBe(false);
    });

    it("keeps the subtitles panel as it is while a flashcard is open", () => {
      const [screen] = apply(
        actions.cuePanelToggled(),
        openWithClip({ start_ms: 0, end_ms: 1_000 }),
      );
      expect(screen.panels.cues).toBe(true);
    });

    it("shows the waveform when it is hidden", () => {
      const [screen] = apply(actions.waveformToggled());
      expect(screen.panels.waveform).toBe(true);
    });

    it("hides the waveform when it is shown", () => {
      const [screen] = apply(
        actions.waveformToggled(),
        actions.waveformToggled(),
      );
      expect(screen.panels.waveform).toBe(false);
    });

    it("cycles from both subtitles to the target language only", () => {
      const [screen] = apply(actions.subtitleDisplayCycled());
      expect(screen.panels.subtitleDisplay).toBe("target");
    });

    it("cycles from the translation back to both subtitles", () => {
      const cycled = actions.subtitleDisplayCycled();
      const [screen] = apply(cycled, cycled, cycled);
      expect(screen.panels.subtitleDisplay).toBe("both");
    });

    it("hides the subtitles over the stage when they are shown", () => {
      const [screen] = apply(actions.subtitlesToggled());
      expect(screen.panels.areSubtitlesHidden).toBe(true);
    });

    it("keeps the subtitle display when the subtitles are hidden", () => {
      const [screen] = apply(
        actions.subtitlesToggled(),
        actions.subtitleDisplayCycled(),
      );
      expect(screen.panels.subtitleDisplay).toBe("target");
    });

    it("keeps the panels as they are for other actions", () => {
      const before = mediaScreenAfter();
      const [screen] = applyToMediaScreenIn(
        before,
        actions.playerTimeChanged(3),
      );
      expect(screen.panels).toBe(before.screen.panels);
    });

    it("keeps the cue panel's measured span", () => {
      const [screen] = apply(
        actions.cuePanelSpanMeasured({ first: 3, last: 9 }),
      );
      expect(screen.cuePanelSpan).toEqual({ first: 3, last: 9 });
    });
  });
});
