import type { Cue } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import { shownCueAfter } from "./shownCueAfter.ts";

const first: Cue = { index: 1, start_ms: 1_000, end_ms: 2_000, text: "Eins" };
const second: Cue = { index: 2, start_ms: 6_000, end_ms: 7_000, text: "Zwei" };
const cues = [first, second];

describe("shownCueAfter", () => {
  it("finds the cue spoken at the time", () => {
    expect(shownCueAfter(null, cues, null, 6_500)).toBe(second);
  });

  it("finds no cue before the first", () => {
    expect(shownCueAfter(null, cues, null, 500)).toBeNull();
  });

  it("finds the next cue once it starts, over the one held before it", () => {
    expect(shownCueAfter(first, cues, 5_900, 6_000)).toBe(second);
  });

  describe("after a cue's end", () => {
    it("keeps the cue while playback carries on from inside it", () => {
      expect(shownCueAfter(first, cues, 1_900, 2_100)).toBe(first);
    });

    it("keeps the cue while playback carries on through its hold", () => {
      expect(shownCueAfter(first, cues, 4_000, 4_500)).toBe(first);
    });

    it("keeps the cue while playback at twice the speed carries on", () => {
      expect(shownCueAfter(first, cues, 1_900, 2_400)).toBe(first);
    });

    it("keeps the cue while the time stands still", () => {
      expect(shownCueAfter(first, cues, 4_000, 4_000)).toBe(first);
    });

    it("shows no cue after a seek forward into the gap", () => {
      expect(shownCueAfter(first, cues, 1_500, 4_000)).toBeNull();
    });

    it("shows no cue after a seek back into the gap", () => {
      expect(shownCueAfter(first, cues, 4_500, 4_000)).toBeNull();
    });

    it("shows no cue after a seek back from a later cue", () => {
      expect(shownCueAfter(second, cues, 6_500, 4_000)).toBeNull();
    });

    it("shows no cue when the time was not observed before", () => {
      expect(shownCueAfter(null, cues, null, 4_000)).toBeNull();
    });
  });

  it("finds an earlier cue still spoken when the latest to start has ended", () => {
    const long: Cue = { index: 1, start_ms: 0, end_ms: 9_000, text: "Lang" };
    const short: Cue = { index: 2, start_ms: 1_000, end_ms: 2_000, text: "K" };
    expect(shownCueAfter(null, [long, short], null, 3_000)).toBe(long);
  });
});
