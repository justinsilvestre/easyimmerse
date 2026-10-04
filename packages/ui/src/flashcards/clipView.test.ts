import { describe, expect, it } from "vitest";
import {
  draggedHandle,
  moveClipEnd,
  moveClipStart,
  overshootPx,
  peakSpan,
  timeAfterKey,
  timeAtX,
  viewAroundClip,
  viewIncluding,
  viewIncludingAll,
  viewWidened,
  xOfTime,
} from "./clipView.ts";

const frame = { left: 100, width: 400 };
const view = { startMs: 1000, endMs: 5000 };

describe("viewAroundClip", () => {
  it("leaves at least a second of room on each side of a short clip", () => {
    expect(viewAroundClip({ start_ms: 3000, end_ms: 4000 }, 60_000)).toEqual({
      startMs: 2000,
      endMs: 5000,
    });
  });

  it("leaves room in proportion to a long clip", () => {
    expect(
      viewAroundClip({ start_ms: 10_000, end_ms: 20_000 }, 60_000),
    ).toEqual({
      startMs: 5000,
      endMs: 25_000,
    });
  });

  it("stays within the file", () => {
    expect(viewAroundClip({ start_ms: 200, end_ms: 9800 }, 10_000)).toEqual({
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

describe("viewIncludingAll", () => {
  it("widens the view to take in every time", () => {
    expect(viewIncludingAll(view, [800, 3000, 5200], 60_000)).toEqual({
      startMs: 300,
      endMs: 5700,
    });
  });
});

describe("timeAtX", () => {
  it("reads the time under a position on the waveform", () => {
    expect(timeAtX(frame, view, 200)).toBe(2000);
  });

  it("reads a time beyond the view for a position past the waveform", () => {
    expect(timeAtX(frame, view, 60)).toBe(600);
  });
});

describe("xOfTime", () => {
  it("places a time on the waveform", () => {
    expect(xOfTime(frame, view, 4000)).toBe(400);
  });
});

describe("overshootPx", () => {
  it("is zero on the waveform", () => {
    expect(overshootPx(frame, 300)).toBe(0);
  });

  it("is negative before the left edge", () => {
    expect(overshootPx(frame, 90)).toBe(-10);
  });

  it("is positive after the right edge", () => {
    expect(overshootPx(frame, 530)).toBe(30);
  });
});

describe("viewWidened", () => {
  it("widens the left side at full speed for a handle held far past it", () => {
    expect(viewWidened(view, -200, 100, 60_000)).toEqual({
      startMs: 200,
      endMs: 5000,
    });
  });

  it("widens more slowly for a handle held just past the edge", () => {
    expect(viewWidened(view, 15, 100, 60_000)).toEqual({
      startMs: 1000,
      endMs: 5200,
    });
  });

  it("stays within the file", () => {
    expect(viewWidened(view, 60, 1000, 6000).endMs).toBe(6000);
  });

  it("leaves the view alone when no time has passed", () => {
    expect(viewWidened(view, -60, 0, 60_000)).toEqual(view);
  });
});

describe("draggedHandle", () => {
  const drag = {
    view,
    frame,
    elapsedMs: 0,
    durationMs: 60_000,
    constrain: (ms: number) => ms,
  };

  it("moves the handle to the time under it on the waveform", () => {
    expect(draggedHandle({ ...drag, x: 300 }).ms).toBe(3000);
  });

  it("keeps the view while the handle is on the waveform", () => {
    expect(draggedHandle({ ...drag, x: 300, elapsedMs: 100 }).view).toBe(view);
  });

  it("holds the handle at the edge it is dragged past", () => {
    expect(draggedHandle({ ...drag, x: 50 }).ms).toBe(1000);
  });

  it("widens the view while the handle is held past an edge", () => {
    expect(draggedHandle({ ...drag, x: 560, elapsedMs: 100 }).view.endMs).toBe(
      5800,
    );
  });

  it("moves the held handle with the widening edge", () => {
    expect(draggedHandle({ ...drag, x: 560, elapsedMs: 100 }).ms).toBe(5800);
  });

  it("does not widen the view past where the handle may go", () => {
    expect(
      draggedHandle({
        ...drag,
        x: 560,
        elapsedMs: 100,
        constrain: (ms) => Math.min(ms, 5300),
      }).view.endMs,
    ).toBe(5300);
  });

  it("does not widen the view on a side the handle cannot reach", () => {
    expect(
      draggedHandle({
        ...drag,
        x: 50,
        elapsedMs: 100,
        constrain: (ms) => Math.max(ms, 2000),
      }).view,
    ).toEqual(view);
  });
});

describe("peakSpan", () => {
  it("reaches out to the whole peaks at either end of the view", () => {
    expect(peakSpan(240, 24_000, { startMs: 750, endMs: 4020 })).toEqual({
      startMs: 700,
      endMs: 4100,
    });
  });
});

describe("moveClipStart", () => {
  it("keeps the start before the end", () => {
    expect(moveClipStart({ start_ms: 1000, end_ms: 2000 }, 1950).start_ms).toBe(
      1800,
    );
  });

  it("keeps the start at or after the beginning of the file", () => {
    expect(moveClipStart({ start_ms: 1000, end_ms: 2000 }, -50).start_ms).toBe(
      0,
    );
  });
});

describe("moveClipEnd", () => {
  it("keeps the end within the file", () => {
    expect(
      moveClipEnd({ start_ms: 1000, end_ms: 2000 }, 2500, 2200).end_ms,
    ).toBe(2200);
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
