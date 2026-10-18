import { describe, expect, it } from "vitest";
import type { AppAction } from "../../app/appAction.ts";
import { actions } from "../../app/appAction.ts";
import { openWithClip } from "../../flashcards/exampleFlashcards.ts";
import { mediaScreenAfter } from "./mediaScreenTestSupport.ts";
import { mediaFilesListed } from "./playbackTestActions.ts";
import { waveformViews } from "./waveformViews.ts";

/** The views of m1's media screen, a file on the server's disk 600 s long, after the given actions. */
function viewsAfter(...after: AppAction[]) {
  const { screen } = mediaScreenAfter(mediaFilesListed(), ...after);
  return waveformViews(screen, 600_000);
}

describe("waveformViews", () => {
  it("centres the player strip on the current time while the waveform panel is open", () => {
    const { player } = viewsAfter(
      actions.waveformToggled(),
      actions.playerTimeChanged(100),
    );
    expect(player).toEqual({
      viewStartMs: 70_000,
      viewEndMs: 130_000,
      focusMs: 100_000,
      durationMs: 600_000,
    });
  });

  it("loads nothing for the player strip while the waveform panel is closed", () => {
    expect(viewsAfter().player).toBeNull();
  });

  it("loads the open flashcard's clip with a minute on either side", () => {
    const { clip } = viewsAfter(
      openWithClip({ start_ms: 100_000, end_ms: 101_000 }),
    );
    expect(clip).toEqual({
      viewStartMs: 40_000,
      viewEndMs: 161_000,
      focusMs: 100_000,
      durationMs: 600_000,
    });
  });

  it("loads nothing for a file the browser holds", () => {
    const { screen } = mediaScreenAfter(actions.waveformToggled());
    expect(waveformViews(screen, 600_000).player).toBeNull();
  });

  it("loads nothing before the file's length is known", () => {
    const { screen } = mediaScreenAfter(
      mediaFilesListed(),
      actions.waveformToggled(),
    );
    expect(waveformViews(screen, 0).player).toBeNull();
  });
});
