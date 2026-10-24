import type { AudioClip } from "@easyimmerse/types";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ClipEditor } from "./ClipEditor.tsx";

afterEach(cleanup);

function renderEditor(
  onClipChange: (clip: AudioClip) => void = () => undefined,
  onScreenshotMsChange: (ms: number) => void = () => undefined,
  screenshotMs = 3000,
) {
  render(
    <ClipEditor
      peaks={[0.2, 0.5, 0.8, 0.4]}
      durationMs={10_000}
      clip={{ start_ms: 2000, end_ms: 4000 }}
      screenshotMs={screenshotMs}
      onClipChange={onClipChange}
      onScreenshotMsChange={onScreenshotMsChange}
    />,
  );
}

/** Places the waveform from 0 to 1000 pixels on the screen, so that the editor above shows 1 to 5 seconds across it. */
function layOutWaveform(slider: HTMLElement) {
  const waveform = slider.parentElement as HTMLElement;
  vi.spyOn(waveform, "getBoundingClientRect").mockReturnValue({
    left: 0,
    width: 1000,
  } as DOMRect);
}

describe("ClipEditor", () => {
  it("keeps the point a handle was grabbed at under the pointer", () => {
    const clips: AudioClip[] = [];
    renderEditor((clip) => clips.push(clip));
    const start = screen.getByRole("slider", { name: "Clip start" });
    layOutWaveform(start);
    fireEvent.pointerDown(start, { pointerId: 1, button: 0, clientX: 254 });
    fireEvent.pointerMove(start, { pointerId: 1, buttons: 1, clientX: 504 });
    expect(clips).toEqual([{ start_ms: 3000, end_ms: 4000 }]);
  });

  it("holds a handle dragged past the waveform at its edge", () => {
    const clips: AudioClip[] = [];
    renderEditor((clip) => clips.push(clip));
    const end = screen.getByRole("slider", { name: "Clip end" });
    layOutWaveform(end);
    fireEvent.pointerDown(end, { pointerId: 1, button: 0, clientX: 750 });
    fireEvent.pointerMove(end, { pointerId: 1, buttons: 1, clientX: 1100 });
    expect(clips).toEqual([{ start_ms: 2000, end_ms: 5000 }]);
  });

  it("stops following the pointer once it is released", () => {
    const clips: AudioClip[] = [];
    renderEditor((clip) => clips.push(clip));
    const start = screen.getByRole("slider", { name: "Clip start" });
    layOutWaveform(start);
    fireEvent.pointerDown(start, { pointerId: 1, button: 0, clientX: 250 });
    fireEvent.pointerUp(start, { pointerId: 1, clientX: 250 });
    fireEvent.pointerMove(start, { pointerId: 1, clientX: 500 });
    expect(clips).toEqual([]);
  });

  it("widens the view to show a screenshot time away from the clip", () => {
    renderEditor(undefined, undefined, 9000);
    expect(
      Number.parseFloat(
        screen.getByRole("slider", { name: "Screenshot time" }).style.left,
      ),
    ).toBeLessThan(100);
  });

  it("moves the clip's start with the arrow keys", () => {
    const clips: AudioClip[] = [];
    renderEditor((clip) => clips.push(clip));
    fireEvent.keyDown(screen.getByRole("slider", { name: "Clip start" }), {
      key: "ArrowRight",
    });
    expect(clips).toEqual([{ start_ms: 2100, end_ms: 4000 }]);
  });

  it("moves the clip's end by a second with Shift and an arrow key", () => {
    const clips: AudioClip[] = [];
    renderEditor((clip) => clips.push(clip));
    fireEvent.keyDown(screen.getByRole("slider", { name: "Clip end" }), {
      key: "ArrowLeft",
      shiftKey: true,
    });
    expect(clips).toEqual([{ start_ms: 2000, end_ms: 3000 }]);
  });

  it("moves the screenshot time with the arrow keys", () => {
    const times: number[] = [];
    renderEditor(undefined, (ms) => times.push(ms));
    fireEvent.keyDown(screen.getByRole("slider", { name: "Screenshot time" }), {
      key: "ArrowLeft",
    });
    expect(times).toEqual([2900]);
  });

  it("reads the clip's start as a timestamp", () => {
    renderEditor();
    expect(
      screen
        .getByRole("slider", { name: "Clip start" })
        .getAttribute("aria-valuetext"),
    ).toBe("0:02.0");
  });
});
