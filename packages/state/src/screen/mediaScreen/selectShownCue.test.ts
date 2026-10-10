import type { Cue } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import type { AppAction } from "../../app/appAction.ts";
import { actions } from "../../app/appAction.ts";
import { stateAfter } from "../../app/stateAfter.ts";
import { selectShownCue, shownCueAt } from "./selectShownCue.ts";

const first: Cue = { index: 1, start_ms: 1_000, end_ms: 2_000, text: "Eins" };
const second: Cue = { index: 2, start_ms: 6_000, end_ms: 7_000, text: "Zwei" };
const cues = [first, second];

describe("shownCueAt", () => {
  it("finds the cue spoken at the time", () => {
    expect(shownCueAt(cues, 6_500, null)).toBe(second);
  });

  it("finds no cue before the first", () => {
    expect(shownCueAt(cues, 500, null)).toBeNull();
  });

  it("finds the next cue once it starts, over the one held before it", () => {
    expect(shownCueAt(cues, 6_000, 1_500)).toBe(second);
  });

  describe("after a cue's end", () => {
    it("keeps the cue while playback carries on from the start of the file", () => {
      expect(shownCueAt(cues, 4_500, null)).toBe(first);
    });

    it("keeps the cue while playback carries on from a seek before it", () => {
      expect(shownCueAt(cues, 4_500, 500)).toBe(first);
    });

    it("keeps the cue while playback carries on from a seek inside it", () => {
      expect(shownCueAt(cues, 2_100, 1_900)).toBe(first);
    });

    it("shows no cue after a seek into the gap", () => {
      expect(shownCueAt(cues, 4_500, 4_000)).toBeNull();
    });

    it("shows no cue after a seek to its very end", () => {
      expect(shownCueAt(cues, 2_000, 2_000)).toBeNull();
    });

    it("shows no cue after a seek back from a later cue into the gap", () => {
      expect(shownCueAt(cues, 4_000, 4_000)).toBeNull();
    });

    it("keeps a later cue after a seek into the gap before it", () => {
      expect(shownCueAt(cues, 7_500, 4_000)).toBe(second);
    });
  });

  it("finds an earlier cue still spoken when the latest to start has ended", () => {
    const long: Cue = { index: 1, start_ms: 0, end_ms: 9_000, text: "Lang" };
    const short: Cue = { index: 2, start_ms: 1_000, end_ms: 2_000, text: "K" };
    expect(shownCueAt([long, short], 3_000, 2_500)).toBe(long);
  });
});

/** Returns the index of the cue shown on m1's media screen after the given actions. */
const shownIndexAfter = (...after: AppAction[]) =>
  selectShownCue(
    { app: stateAfter(actions.openMediaFileRequested("p1", "m1"), ...after) },
    cues,
  )?.index ?? null;

describe("selectShownCue", () => {
  it("keeps a cue shown after its end while playback carries on from it", () => {
    expect(
      shownIndexAfter(
        actions.seekRequested(1.5),
        actions.playerTimeChanged(2.5),
      ),
    ).toBe(1);
  });

  it("shows no cue after the app seeks into the gap after a cue", () => {
    expect(
      shownIndexAfter(actions.playerTimeChanged(1.5), actions.seekRequested(4)),
    ).toBeNull();
  });

  it("shows no cue after the player reports a seek into the gap after a cue", () => {
    expect(
      shownIndexAfter(
        actions.playerTimeChanged(1.5),
        actions.playerSeeking(4),
        actions.playerTimeChanged(4.25),
      ),
    ).toBeNull();
  });

  it("keeps a cue shown after the resume seeks to a time before it", () => {
    expect(
      shownIndexAfter(
        actions.playbackPositionLoaded("m1", 6_500),
        actions.playerDurationChanged(600),
        actions.playerTimeChanged(7.5),
      ),
    ).toBe(2);
  });

  it("shows no cue while no media screen is open", () => {
    expect(selectShownCue({ app: stateAfter() }, cues)).toBeNull();
  });
});
