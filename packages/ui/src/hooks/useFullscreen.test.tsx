import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useFullscreen } from "./useFullscreen.ts";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function FullscreenProbe() {
  const fullscreen = useFullscreen();
  return (
    <button type="button" onClick={fullscreen.toggle}>
      {fullscreen.isFullscreen ? "fullscreen" : "windowed"}
    </button>
  );
}

/** jsdom has no fullscreen support, so the element the browser would report is defined on the document by hand. */
function fakeFullscreenElement(element: Element | null | undefined) {
  Object.defineProperty(document, "fullscreenElement", {
    configurable: true,
    get: () => element,
  });
}

describe("useFullscreen", () => {
  it("reports a page that does not fill the screen", () => {
    fakeFullscreenElement(null);
    render(<FullscreenProbe />);
    expect(screen.getByRole("button").textContent).toBe("windowed");
  });

  it("reports a page in a browser without the Fullscreen API as not filling the screen", () => {
    fakeFullscreenElement(undefined);
    render(<FullscreenProbe />);
    expect(screen.getByRole("button").textContent).toBe("windowed");
  });

  it("reports the page filling the screen once the browser says so", () => {
    fakeFullscreenElement(null);
    render(<FullscreenProbe />);
    fakeFullscreenElement(document.documentElement);
    act(() => {
      document.dispatchEvent(new Event("fullscreenchange"));
    });
    expect(screen.getByRole("button").textContent).toBe("fullscreen");
  });

  it("asks the browser to fill the screen with the page", () => {
    fakeFullscreenElement(null);
    const request = vi.fn().mockResolvedValue(undefined);
    document.documentElement.requestFullscreen = request;
    render(<FullscreenProbe />);
    act(() => screen.getByRole("button").click());
    expect(request).toHaveBeenCalledOnce();
  });

  it("asks the browser to leave fullscreen when the page fills the screen", () => {
    fakeFullscreenElement(document.documentElement);
    const exit = vi.fn().mockResolvedValue(undefined);
    document.exitFullscreen = exit;
    render(<FullscreenProbe />);
    act(() => screen.getByRole("button").click());
    expect(exit).toHaveBeenCalledOnce();
  });
});
