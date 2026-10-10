import { createBrowserFileRegistry } from "@easyimmerse/state";
import { act, cleanup, render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { afterEach, describe, expect, it } from "vitest";
import { createFrameCapturer } from "../player/browserFrameCapturer.ts";
import type { FrameSource } from "../player/captureVideoFrame.ts";
import { createTestAppStore } from "../testSupport/createTestAppStore.ts";
import type { ScreenshotSource } from "./useScreenshotSource.ts";
import { useScreenshotUrl } from "./useScreenshotUrl.ts";

afterEach(cleanup);

/** A capturer whose frame at each second is drawn only once the test releases that second. */
function createReleasedFrameCapturer() {
  const gates = new Map<number, { opened: Promise<void>; open: () => void }>();
  const gateAt = (seconds: number) => {
    let open = () => {};
    const opened = new Promise<void>((resolve) => {
      open = resolve;
    });
    const gate = gates.get(seconds) ?? { opened, open };
    gates.set(seconds, gate);
    return gate;
  };
  const capturer = createFrameCapturer({
    openVideo: async () => ({ element: {} as FrameSource, close: () => {} }),
    captureFrame: async (_video, seconds) => {
      await gateAt(seconds).opened;
      return `frame-at-${seconds}`;
    },
  });
  /** Draws the frame at the second and waits a task, so that the cache has taken the frame in. */
  const release = (seconds: number) =>
    act(async () => {
      gateAt(seconds).open();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  return { capturer, release };
}

type ShownProps = { source: ScreenshotSource; atMs: number };

function ShownScreenshot({ source, atMs }: ShownProps) {
  return <output>{useScreenshotUrl(source, atMs) ?? "none"}</output>;
}

function renderBrowserScreenshots() {
  const registry = createBrowserFileRegistry<File>();
  const clip = registry.register(new File(["clip"], "clip.mp4"));
  const other = registry.register(new File(["other"], "other.mp4"));
  const sources: Record<"clip.mp4" | "other.mp4", ScreenshotSource> = {
    "clip.mp4": { kind: "browser", file: { name: "clip.mp4", source: clip } },
    "other.mp4": {
      kind: "browser",
      file: { name: "other.mp4", source: other },
    },
  };
  const sourceOf = (name: "clip.mp4" | "other.mp4") => sources[name];
  const { capturer, release } = createReleasedFrameCapturer();
  const { store } = createTestAppStore(undefined, null, {
    registry,
    frameCapturer: capturer,
  });
  const Shown = (props: ShownProps) => (
    <Provider store={store}>
      <ShownScreenshot {...props} />
    </Provider>
  );
  const { rerender } = render(
    <Shown source={sourceOf("clip.mp4")} atMs={1000} />,
  );
  const show = (atMs: number, source = sourceOf("clip.mp4")) =>
    rerender(<Shown source={source} atMs={atMs} />);
  return { show, release, sourceOf };
}

const shownFrame = () => screen.getByRole("status").textContent;

describe("useScreenshotUrl", () => {
  it("shows the frame at a new time once it is captured", async () => {
    const { show, release } = renderBrowserScreenshots();
    await release(1);
    show(2000);
    await release(2);
    expect(shownFrame()).toBe("frame-at-2");
  });

  it("keeps the frame shown while the frame at a new time is captured", async () => {
    const { show, release } = renderBrowserScreenshots();
    await release(1);
    show(2000);
    expect(shownFrame()).toBe("frame-at-1");
  });

  it("ignores a capture that finishes after the time has moved on", async () => {
    const { show, release } = renderBrowserScreenshots();
    show(2000);
    await release(1);
    expect(shownFrame()).toBe("none");
  });

  it("shows the frame at a time returned to while its capture was queued", async () => {
    const { show, release } = renderBrowserScreenshots();
    show(3000);
    show(2000);
    show(3000);
    await release(1);
    await release(3);
    expect(shownFrame()).toBe("frame-at-3");
  });

  it("shows no frame of another file while the new file's frame is captured", async () => {
    const { show, release, sourceOf } = renderBrowserScreenshots();
    await release(1);
    show(2000, sourceOf("other.mp4"));
    expect(shownFrame()).toBe("none");
  });
});
