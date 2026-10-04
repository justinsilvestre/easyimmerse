import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { FrameCapturer } from "./browserFrameCapturer.ts";
import { useCapturedFrame } from "./useCapturedFrame.ts";

afterEach(cleanup);

type Pending = { atMs: number; resolve: (frame: string | null) => void };

/** A capturer whose captures wait until the test answers them, and which remembers what it answered. */
function createControlledCapturer() {
  const pending: Pending[] = [];
  const answered = new Map<number, string | null>();
  const capturer: FrameCapturer = {
    peek: (_file, atMs) => answered.get(atMs),
    capture: (_file, atMs) =>
      new Promise((resolve) =>
        pending.push({
          atMs,
          resolve: (frame) => {
            answered.set(atMs, frame);
            resolve(frame);
          },
        }),
      ),
  };
  const answer = async (atMs: number, frame: string | null) => {
    await act(async () => {
      for (const capture of pending.filter((each) => each.atMs === atMs))
        capture.resolve(frame);
    });
  };
  return { capturer, pending, answer };
}

function Frame(props: {
  file: Blob | null;
  atMs: number | null;
  capturer: FrameCapturer;
}) {
  const url = useCapturedFrame(props.file, props.atMs, props.capturer);
  return <output>{url ?? "none"}</output>;
}

const shownFrame = () => screen.getByRole("status").textContent;

const file = new Blob(["video"]);

describe("useCapturedFrame", () => {
  it("shows no frame while the first capture is under way", () => {
    const { capturer } = createControlledCapturer();
    render(<Frame file={file} atMs={1000} capturer={capturer} />);
    expect(shownFrame()).toBe("none");
  });

  it("shows the frame once it is captured", async () => {
    const { capturer, answer } = createControlledCapturer();
    render(<Frame file={file} atMs={1000} capturer={capturer} />);
    await answer(1000, "frame-1");
    expect(shownFrame()).toBe("frame-1");
  });

  it("captures nothing without a file", () => {
    const { capturer, pending } = createControlledCapturer();
    render(<Frame file={null} atMs={1000} capturer={capturer} />);
    expect(pending).toEqual([]);
  });

  it("captures nothing without a time", () => {
    const { capturer, pending } = createControlledCapturer();
    render(<Frame file={file} atMs={null} capturer={capturer} />);
    expect(pending).toEqual([]);
  });

  it("captures the frame at a new time", async () => {
    const { capturer, answer } = createControlledCapturer();
    const { rerender } = render(
      <Frame file={file} atMs={1000} capturer={capturer} />,
    );
    await answer(1000, "frame-1");
    rerender(<Frame file={file} atMs={2000} capturer={capturer} />);
    await answer(2000, "frame-2");
    expect(shownFrame()).toBe("frame-2");
  });

  it("keeps the last frame shown while the next one is captured", async () => {
    const { capturer, answer } = createControlledCapturer();
    const { rerender } = render(
      <Frame file={file} atMs={1000} capturer={capturer} />,
    );
    await answer(1000, "frame-1");
    rerender(<Frame file={file} atMs={2000} capturer={capturer} />);
    expect(shownFrame()).toBe("frame-1");
  });

  it("ignores a capture that finishes after the time has moved on", async () => {
    const { capturer, answer } = createControlledCapturer();
    const { rerender } = render(
      <Frame file={file} atMs={1000} capturer={capturer} />,
    );
    rerender(<Frame file={file} atMs={2000} capturer={capturer} />);
    await answer(1000, "frame-1");
    expect(shownFrame()).toBe("none");
  });

  it("shows no frame from another file", async () => {
    const { capturer, answer } = createControlledCapturer();
    const { rerender } = render(
      <Frame file={file} atMs={1000} capturer={capturer} />,
    );
    await answer(1000, "frame-1");
    rerender(
      <Frame file={new Blob(["other"])} atMs={3000} capturer={capturer} />,
    );
    expect(shownFrame()).toBe("none");
  });
});
