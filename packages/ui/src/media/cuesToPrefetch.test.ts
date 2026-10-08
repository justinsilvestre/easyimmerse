import type { Cue } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import { cuesToPrefetch } from "./cuesToPrefetch.ts";

/** Cues of one second each, one every ten seconds from 0. */
function cuesEveryTenSeconds(count: number): Cue[] {
  return Array.from({ length: count }, (_, index) => ({
    index,
    start_ms: index * 10_000,
    end_ms: index * 10_000 + 1000,
    text: `cue ${index}`,
  }));
}

const indexesOf = (cues: readonly Cue[]) => cues.map((cue) => cue.index);

describe("cuesToPrefetch", () => {
  it("takes the cue shown first, then those of the next minute", () => {
    const cues = cuesEveryTenSeconds(20);
    expect(
      indexesOf(
        cuesToPrefetch(cues, {
          shownCue: cues[2] ?? null,
          currentMs: 25_000,
          panelSpan: null,
        }),
      ),
    ).toEqual([2, 3, 4, 5, 6, 7, 8]);
  });

  it("adds the cues the panel shows after those", () => {
    const cues = cuesEveryTenSeconds(20);
    expect(
      indexesOf(
        cuesToPrefetch(cues, {
          shownCue: null,
          currentMs: 145_000,
          panelSpan: { first: 0, last: 1 },
        }),
      ),
    ).toEqual([15, 16, 17, 18, 19, 0, 1]);
  });

  it("takes each cue once", () => {
    const cues = cuesEveryTenSeconds(20);
    expect(
      indexesOf(
        cuesToPrefetch(cues, {
          shownCue: cues[0] ?? null,
          currentMs: 0,
          panelSpan: { first: 0, last: 2 },
        }),
      ),
    ).toEqual([0, 1, 2, 3, 4, 5]);
  });
});
