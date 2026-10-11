import type { Alignment, AlignmentContent } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import { latestAlignments } from "./latestAlignments.ts";

function audioContent(audioId: string): AlignmentContent {
  return { kind: "audio", audio_media_file_id: audioId, segments: [] };
}

function translationContent(translationId: string): AlignmentContent {
  return {
    kind: "translation",
    translation_media_file_id: translationId,
    links: [],
  };
}

function alignment(
  id: string,
  createdAtMs: number,
  content: AlignmentContent,
): Alignment {
  return {
    id,
    media_file_id: "b1",
    provider: null,
    created_at_ms: createdAtMs,
    content,
  };
}

describe("latestAlignments", () => {
  it("picks the newest audio alignment", () => {
    expect(
      latestAlignments([
        alignment("old", 1, audioContent("a1")),
        alignment("new", 2, audioContent("a2")),
      ]).audio,
    ).toEqual(audioContent("a2"));
  });

  it("picks the newest translation alignment", () => {
    expect(
      latestAlignments([
        alignment("new", 5, translationContent("t2")),
        alignment("old", 3, translationContent("t1")),
      ]).translation,
    ).toEqual(translationContent("t2"));
  });

  it("does not let a newer alignment of another kind replace one", () => {
    expect(
      latestAlignments([
        alignment("audio", 1, audioContent("a1")),
        alignment("translation", 2, translationContent("t1")),
      ]).audio,
    ).toEqual(audioContent("a1"));
  });

  it("picks the first listed of two equally new alignments", () => {
    expect(
      latestAlignments([
        alignment("first", 4, audioContent("a1")),
        alignment("second", 4, audioContent("a2")),
      ]).audio,
    ).toEqual(audioContent("a1"));
  });

  it("returns null for a kind the document has no alignment of", () => {
    expect(
      latestAlignments([alignment("audio", 1, audioContent("a1"))]).translation,
    ).toBeNull();
  });
});
