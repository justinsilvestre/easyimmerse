import type { Cue } from "@easyimmerse/types";
import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useShownCue } from "./useShownCue.ts";

afterEach(cleanup);

const cues: Cue[] = [
  { index: 1, start_ms: 1_000, end_ms: 2_000, text: "Eins" },
  { index: 2, start_ms: 6_000, end_ms: 7_000, text: "Zwei" },
];

/** Renders the hook at each time in turn, as playback or seeks would move it, and returns the index of the cue shown last. */
function shownIndexAfter(times: number[]) {
  const { result, rerender } = renderHook(({ ms }) => useShownCue(cues, ms), {
    initialProps: { ms: times[0] ?? 0 },
  });
  for (const ms of times.slice(1)) rerender({ ms });
  return result.current?.index ?? null;
}

describe("useShownCue", () => {
  it("shows the cue spoken at the time", () => {
    expect(shownIndexAfter([6_500])).toBe(2);
  });

  it("keeps a cue shown after its end while playback carries on", () => {
    expect(shownIndexAfter([1_500, 1_750, 2_000, 2_250, 2_500])).toBe(1);
  });

  it("shows no cue after a seek into the gap between cues", () => {
    expect(shownIndexAfter([1_500, 1_750, 4_000])).toBeNull();
  });

  it("shows no cue when it starts in the gap between cues", () => {
    expect(shownIndexAfter([4_000])).toBeNull();
  });

  it("keeps showing no cue while playback carries on through the gap after a seek", () => {
    expect(shownIndexAfter([1_500, 4_000, 4_250])).toBeNull();
  });
});
