import { vi } from "vitest";

/** Gives the element a duration, which happy-dom leaves read-only and unset. */
export function stubMediaDuration(element: HTMLMediaElement, seconds: number) {
  Object.defineProperty(element, "duration", {
    configurable: true,
    value: seconds,
  });
}

/** Gives the video element a frame size, which happy-dom leaves at zero because it decodes nothing. */
export function stubVideoFrameSize(
  video: HTMLVideoElement,
  width: number,
  height: number,
) {
  Object.defineProperty(video, "videoWidth", {
    configurable: true,
    value: width,
  });
  Object.defineProperty(video, "videoHeight", {
    configurable: true,
    value: height,
  });
}

/**
 * Makes canvases draw nothing and encode to the given data URL, since happy-dom cannot render.
 * Returns a function that restores the canvas.
 */
export function stubCanvasEncoding(dataUrl: string): () => void {
  const context = vi
    .spyOn(HTMLCanvasElement.prototype, "getContext")
    .mockReturnValue({ drawImage: () => undefined } as never);
  const encoding = vi
    .spyOn(HTMLCanvasElement.prototype, "toDataURL")
    .mockReturnValue(dataUrl);
  return () => {
    context.mockRestore();
    encoding.mockRestore();
  };
}

/**
 * Adds `requestFullscreen` to every element, which happy-dom lacks, as a mock that resolves.
 * Returns the mock and a function that removes it again.
 */
export function stubRequestFullscreen() {
  const requestFullscreen = vi.fn(() => Promise.resolve());
  Element.prototype.requestFullscreen = requestFullscreen;
  const restore = () => {
    Reflect.deleteProperty(Element.prototype, "requestFullscreen");
  };
  return { requestFullscreen, restore };
}

/** Gives the element a media error, which happy-dom never sets because it loads nothing. */
export function stubMediaError(
  element: HTMLMediaElement,
  code: number,
  message: string,
) {
  Object.defineProperty(element, "error", {
    configurable: true,
    value: { code, message },
  });
}
