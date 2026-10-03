import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ClipEditor } from "./ClipEditor.tsx";
import type { AudioClip } from "./flashcardFields.ts";

afterEach(cleanup);

function renderEditor(
  onClipChange: (clip: AudioClip) => void = () => undefined,
  onScreenshotMsChange: (ms: number) => void = () => undefined,
) {
  render(
    <ClipEditor
      peaks={[0.2, 0.5, 0.8, 0.4]}
      durationMs={10_000}
      clip={{ startMs: 2000, endMs: 4000 }}
      screenshotMs={3000}
      onClipChange={onClipChange}
      onScreenshotMsChange={onScreenshotMsChange}
    />,
  );
}

describe("ClipEditor", () => {
  it("moves the clip's start with the arrow keys", () => {
    const clips: AudioClip[] = [];
    renderEditor((clip) => clips.push(clip));
    fireEvent.keyDown(screen.getByRole("slider", { name: "Clip start" }), {
      key: "ArrowRight",
    });
    expect(clips).toEqual([{ startMs: 2100, endMs: 4000 }]);
  });

  it("moves the clip's end by a second with Shift and an arrow key", () => {
    const clips: AudioClip[] = [];
    renderEditor((clip) => clips.push(clip));
    fireEvent.keyDown(screen.getByRole("slider", { name: "Clip end" }), {
      key: "ArrowLeft",
      shiftKey: true,
    });
    expect(clips).toEqual([{ startMs: 2000, endMs: 3000 }]);
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
