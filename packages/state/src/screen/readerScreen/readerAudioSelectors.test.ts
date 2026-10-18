import type { Alignment, TimedSpan } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import type { AppAction } from "../../app/appAction.ts";
import { actions } from "../../app/appAction.ts";
import { stateAfterWithCache } from "../../app/stateAfter.ts";
import { exampleMediaFile } from "../../server/exampleMediaFile.ts";
import { serverCacheWith } from "../../server/serverCacheWith.ts";
import { segmentSpokenAt, selectSpokenSpan } from "./readerAudioSelectors.ts";

function segment(
  paragraphIndex: number,
  startMs: number,
  endMs: number,
): TimedSpan {
  return {
    span: {
      chapter_index: 0,
      paragraph_index: paragraphIndex,
      start: 0,
      end: 10,
    },
    start_ms: startMs,
    end_ms: endMs,
  };
}

const first = segment(0, 0, 1000);
const second = segment(1, 1000, 2500);
const third = segment(2, 2500, 4000);

const alignment: Alignment = {
  id: "al1",
  media_file_id: "b1",
  provider: null,
  created_at_ms: 0,
  content: {
    kind: "audio",
    audio_media_file_id: "a1",
    segments: [first, second, third],
  },
};

const backend = serverCacheWith(
  "listAlignments",
  { projectId: "p1", mediaFileId: "b1" },
  { alignments: [alignment] },
  serverCacheWith("listMediaFiles", "p1", {
    media_files: [
      exampleMediaFile("b1", "sample.epub"),
      exampleMediaFile("a1", "sample.mp3"),
    ],
  }),
);

/** The reader on the aligned book after the given actions. */
const reading = (...done: AppAction[]) => ({
  app: stateAfterWithCache(
    backend,
    actions.openMediaFileRequested("p1", "b1"),
    ...done,
  ),
  backend,
});

describe("selectSpokenSpan", () => {
  it("returns the text of the segment heard at the player's time", () => {
    expect(selectSpokenSpan(reading(actions.playerTimeChanged(1.2)))).toBe(
      second.span,
    );
  });

  it("returns null before the audio has played", () => {
    expect(selectSpokenSpan(reading())).toBeNull();
  });

  it("returns the first segment's text once the audio plays from its start", () => {
    expect(selectSpokenSpan(reading(actions.playerPlayingChanged(true)))).toBe(
      first.span,
    );
  });

  it("returns null between segments", () => {
    const state = reading(actions.playerTimeChanged(4.5));
    expect(selectSpokenSpan(state)).toBeNull();
  });
});

describe("segmentSpokenAt", () => {
  it("finds the segment heard at the time", () => {
    expect(segmentSpokenAt([first, second, third], 1200)).toBe(second);
  });

  it("finds the next segment at the end of an earlier one", () => {
    expect(segmentSpokenAt([first, second, third], 1000)).toBe(second);
  });

  it("finds a segment in a list not sorted by time", () => {
    expect(segmentSpokenAt([third, second, first], 500)).toBe(first);
  });

  it("returns null after the last segment ends", () => {
    expect(segmentSpokenAt([first, second, third], 4000)).toBeNull();
  });
});
