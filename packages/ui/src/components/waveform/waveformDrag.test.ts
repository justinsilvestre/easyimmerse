import { describe, expect, it } from "vitest";
import type { FlashcardSegment } from "./flashcardSegment.ts";
import { applyDrag, constrainDrag } from "./waveformDrag.ts";

const segment: FlashcardSegment = {
  id: "f1",
  startMs: 10_000,
  endMs: 20_000,
  screenshotMs: 15_000,
};

describe("constrainDrag", () => {
  it("keeps the clip start before its end", () => {
    const drag = {
      hit: { kind: "clipStart", segmentId: "f1" },
      timeMs: 25_000,
    } as const;
    expect(constrainDrag(drag, [segment], 60_000).timeMs).toBe(19_900);
  });

  it("keeps the clip end within the media", () => {
    const drag = {
      hit: { kind: "clipEnd", segmentId: "f1" },
      timeMs: 70_000,
    } as const;
    expect(constrainDrag(drag, [segment], 60_000).timeMs).toBe(60_000);
  });

  it("keeps the screenshot inside the clip", () => {
    const drag = {
      hit: { kind: "screenshot", segmentId: "f1" },
      timeMs: 5_000,
    } as const;
    expect(constrainDrag(drag, [segment], 60_000).timeMs).toBe(10_000);
  });
});

describe("applyDrag", () => {
  it("returns the segments as they are without a drag", () => {
    const segments = [segment];
    expect(applyDrag(segments, null)).toBe(segments);
  });

  it("moves the dragged handle", () => {
    const drag = {
      hit: { kind: "clipEnd", segmentId: "f1" },
      timeMs: 22_000,
    } as const;
    expect(applyDrag([segment], drag)[0]?.endMs).toBe(22_000);
  });
});
