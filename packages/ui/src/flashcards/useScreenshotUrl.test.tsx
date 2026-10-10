import { createBrowserFileRegistry } from "@easyimmerse/state";
import { cleanup, render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { afterEach, describe, expect, it } from "vitest";
import { createFrameCapturer } from "../player/browserFrameCapturer.ts";
import type { FrameSource } from "../player/captureVideoFrame.ts";
import { createTestAppStore } from "../testSupport/createTestAppStore.ts";
import type { ScreenshotSource } from "./useScreenshotSource.ts";
import { useScreenshotUrl } from "./useScreenshotUrl.ts";

afterEach(cleanup);

/** Creates a capturer that draws the frame at one second at once and never finishes any other. */
const createOneFrameCapturer = () =>
  createFrameCapturer({
    openVideo: async () => ({ element: {} as FrameSource, close: () => {} }),
    captureFrame: (_video, seconds) =>
      seconds === 1 ? Promise.resolve("frame-at-1") : new Promise(() => {}),
  });

type ShownProps = { source: ScreenshotSource; atMs: number };

function ShownScreenshot({ source, atMs }: ShownProps) {
  return <output>{useScreenshotUrl(source, atMs) ?? "none"}</output>;
}

function renderBrowserScreenshots() {
  const registry = createBrowserFileRegistry<File>();
  const sourceOf = (name: string): ScreenshotSource => ({
    kind: "browser",
    file: { name, source: registry.register(new File([name], name)) },
  });
  const { store } = createTestAppStore(undefined, null, {
    registry,
    frameCapturer: createOneFrameCapturer(),
  });
  const Shown = (props: ShownProps) => (
    <Provider store={store}>
      <ShownScreenshot {...props} />
    </Provider>
  );
  return { sourceOf, Shown };
}

describe("useScreenshotUrl", () => {
  it("keeps the frame shown while the frame at a new time is captured", async () => {
    const { sourceOf, Shown } = renderBrowserScreenshots();
    const source = sourceOf("clip.mp4");
    const { rerender } = render(<Shown source={source} atMs={1000} />);
    await screen.findByText("frame-at-1");
    rerender(<Shown source={source} atMs={2000} />);
    expect(screen.getByRole("status").textContent).toBe("frame-at-1");
  });

  it("shows no frame of another file while the new file's frame is captured", async () => {
    const { sourceOf, Shown } = renderBrowserScreenshots();
    const { rerender } = render(
      <Shown source={sourceOf("clip.mp4")} atMs={1000} />,
    );
    await screen.findByText("frame-at-1");
    rerender(<Shown source={sourceOf("other.mp4")} atMs={2000} />);
    expect(screen.getByRole("status").textContent).toBe("none");
  });
});
