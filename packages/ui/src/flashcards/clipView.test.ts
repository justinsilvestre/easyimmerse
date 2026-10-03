import { describe, expect, it } from "vitest";
import {
  moveClipEnd,
  moveClipStart,
  timeAfterKey,
  viewAroundClip,
  viewIncluding,
} from "./clipView.ts";

describe("viewAroundClip", () => {
  it("leaves at least a second of room on each side of a short clip", () => {
    expect(viewAroundClip({ startMs: 3000, endMs: 4000 }, 60_000)).toEqual({
      startMs: 2000,
      endMs: 5000,
    });
  });

  it("leaves room in proportion to a long clip", () => {
    expect(viewAroundClip({ startMs: 10_000, endMs: 20_000 }, 60_000)).toEqual({
      startMs: 5000,
      endMs: 25_000,
    });
  });

  it("stays within the file", () => {
    expect(viewAroundClip({ startMs: 200, endMs: 9800 }, 10_000)).toEqual({
      startMs: 0,
      endMs: 10_000,
    });
  });
});

describe("viewIncluding", () => {
  it("leaves the view alone for a time on it", () => {
    const view = { startMs: 1000, endMs: 5000 };
    expect(viewIncluding(view, 3000, 60_000)).toBe(view);
  });

  it("widens the view to the left for an earlier time", () => {
    expect(viewIncluding({ startMs: 1000, endMs: 5000 }, 800, 60_000)).toEqual({
      startMs: 300,
      endMs: 5000,
    });
  });

  it("widens the view to the right for a later time, within the file", () => {
    expect(viewIncluding({ startMs: 1000, endMs: 5000 }, 5800, 6000)).toEqual({
      startMs: 1000,
      endMs: 6000,
    });
  });
});

describe("moveClipStart", () => {
  it("keeps the start before the end", () => {
    expect(moveClipStart({ startMs: 1000, endMs: 2000 }, 1950).startMs).toBe(
      1800,
    );
  });

  it("keeps the start at or after the beginning of the file", () => {
    expect(moveClipStart({ startMs: 1000, endMs: 2000 }, -50).startMs).toBe(0);
  });
});

describe("moveClipEnd", () => {
  it("keeps the end within the file", () => {
    expect(moveClipEnd({ startMs: 1000, endMs: 2000 }, 2500, 2200).endMs).toBe(
      2200,
    );
  });
});

describe("timeAfterKey", () => {
  it("moves a step back for the left arrow", () => {
    expect(timeAfterKey("ArrowLeft", false, 1000)).toBe(900);
  });

  it("moves a large step forward for the right arrow with Shift", () => {
    expect(timeAfterKey("ArrowRight", true, 1000)).toBe(2000);
  });

  it("ignores other keys", () => {
    expect(timeAfterKey("Enter", false, 1000)).toBeNull();
  });
});
