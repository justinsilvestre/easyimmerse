import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FlashcardSegment } from "./flashcardSegment.ts";
import type { WaveformStripProps } from "./WaveformStrip.tsx";
import { WaveformStrip } from "./WaveformStrip.tsx";

const stripRect = {
  x: 0,
  y: 0,
  top: 0,
  left: 0,
  right: 600,
  bottom: 72,
  width: 600,
  height: 72,
  toJSON: () => undefined,
};

beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(
    stripRect,
  );
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const segment: FlashcardSegment = {
  id: "f1",
  startMs: 10_000,
  endMs: 20_000,
  screenshotMs: 15_000,
};

type Call = [string, ...unknown[]];

/** Renders a 600 px strip showing the first minute of a five-minute file, one pixel per 100 ms. */
function renderStrip(overrides: Partial<WaveformStripProps> = {}) {
  const calls: Call[] = [];
  const record =
    (name: string) =>
    (...args: unknown[]) => {
      calls.push([name, ...args]);
    };
  render(
    <WaveformStrip
      durationMs={300_000}
      currentTimeMs={30_000}
      windows={new Map()}
      cues={[]}
      flashcardSegments={[segment]}
      visibleSpanMs={60_000}
      onSeek={record("seek")}
      onOpenFlashcardSegment={record("open")}
      onClipEndpointMoved={record("clip")}
      onScreenshotMarkerMoved={record("screenshot")}
      onVisibleSpanChange={record("span")}
      {...overrides}
    />,
  );
  return { calls, canvas: screen.getByRole("slider") };
}

function pointer(
  canvas: HTMLElement,
  type: "pointerDown" | "pointerMove" | "pointerUp",
  clientX: number,
  clientY = 36,
  pointerId = 1,
) {
  fireEvent[type](canvas, { clientX, clientY, pointerId, isPrimary: true });
}

describe("WaveformStrip", () => {
  it("seeks to the clicked time", () => {
    const { calls, canvas } = renderStrip();
    pointer(canvas, "pointerDown", 300);
    pointer(canvas, "pointerUp", 300);
    expect(calls).toEqual([["seek", 30_000]]);
  });

  it("does not seek when the pointer moved between press and release", () => {
    const { calls, canvas } = renderStrip();
    pointer(canvas, "pointerDown", 300);
    pointer(canvas, "pointerUp", 320);
    expect(calls).toEqual([]);
  });

  it("opens a flashcard segment on double-click", () => {
    const { calls, canvas } = renderStrip();
    fireEvent.doubleClick(canvas, { clientX: 150, clientY: 36 });
    expect(calls).toEqual([["open", "f1"]]);
  });

  it("does not open anything on double-click in empty space", () => {
    const { calls, canvas } = renderStrip();
    fireEvent.doubleClick(canvas, { clientX: 400, clientY: 36 });
    expect(calls).toEqual([]);
  });

  it("reports a moved clip start after its handle is dragged", () => {
    const { calls, canvas } = renderStrip();
    pointer(canvas, "pointerDown", 100);
    pointer(canvas, "pointerMove", 120);
    pointer(canvas, "pointerUp", 120);
    expect(calls).toEqual([["clip", "f1", "start", 12_000]]);
  });

  it("reports a moved clip end after its handle is dragged", () => {
    const { calls, canvas } = renderStrip();
    pointer(canvas, "pointerDown", 200);
    pointer(canvas, "pointerMove", 250);
    pointer(canvas, "pointerUp", 250);
    expect(calls).toEqual([["clip", "f1", "end", 25_000]]);
  });

  it("reports a moved screenshot marker after it is dragged", () => {
    const { calls, canvas } = renderStrip();
    pointer(canvas, "pointerDown", 150, 5);
    pointer(canvas, "pointerMove", 170, 5);
    pointer(canvas, "pointerUp", 170, 5);
    expect(calls).toEqual([["screenshot", "f1", 17_000]]);
  });

  it("stops a dragged clip start at the screenshot marker", () => {
    const { calls, canvas } = renderStrip();
    pointer(canvas, "pointerDown", 100);
    pointer(canvas, "pointerMove", 260);
    pointer(canvas, "pointerUp", 260);
    expect(calls).toEqual([["clip", "f1", "start", 15_000]]);
  });

  it("doubles the span from the zoom-out button", () => {
    const { calls } = renderStrip();
    fireEvent.click(screen.getByRole("button", { name: "Zoom out" }));
    expect(calls).toEqual([["span", 120_000]]);
  });

  it("halves the span from the zoom-in button", () => {
    const { calls } = renderStrip();
    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    expect(calls).toEqual([["span", 30_000]]);
  });

  it("disables zooming in at the narrowest span", () => {
    renderStrip({ visibleSpanMs: 2_000 });
    expect(screen.getByRole("button", { name: "Zoom in" })).toHaveProperty(
      "disabled",
      true,
    );
  });

  it("disables zooming out once the span shows the whole file", () => {
    renderStrip({ visibleSpanMs: 300_000 });
    expect(screen.getByRole("button", { name: "Zoom out" })).toHaveProperty(
      "disabled",
      true,
    );
  });

  it("disables zooming out at five minutes of a longer file", () => {
    renderStrip({ durationMs: 3_600_000, visibleSpanMs: 300_000 });
    expect(screen.getByRole("button", { name: "Zoom out" })).toHaveProperty(
      "disabled",
      true,
    );
  });

  it("zooms out when the wheel scrolls down", () => {
    const { calls, canvas } = renderStrip();
    fireEvent.wheel(canvas, { deltaY: 100 });
    expect(calls).toEqual([["span", 120_000]]);
  });

  it("zooms in when two pointers spread apart", () => {
    const { calls, canvas } = renderStrip();
    pointer(canvas, "pointerDown", 200, 36, 1);
    pointer(canvas, "pointerDown", 400, 36, 2);
    pointer(canvas, "pointerMove", 0, 36, 1);
    expect(calls).toEqual([["span", 30_000]]);
  });

  it("seeks a second ahead on the right arrow key", () => {
    const { calls, canvas } = renderStrip();
    fireEvent.keyDown(canvas, { key: "ArrowRight" });
    expect(calls).toEqual([["seek", 31_000]]);
  });

  it("seeks ten seconds back on shift and the left arrow key", () => {
    const { calls, canvas } = renderStrip();
    fireEvent.keyDown(canvas, { key: "ArrowLeft", shiftKey: true });
    expect(calls).toEqual([["seek", 20_000]]);
  });

  it("seeks to the end on the End key", () => {
    const { calls, canvas } = renderStrip();
    fireEvent.keyDown(canvas, { key: "End" });
    expect(calls).toEqual([["seek", 300_000]]);
  });

  it("describes the position for assistive technology", () => {
    const { canvas } = renderStrip();
    expect(canvas.getAttribute("aria-valuetext")).toBe("0:30.0 of 5:00.0");
  });
});
