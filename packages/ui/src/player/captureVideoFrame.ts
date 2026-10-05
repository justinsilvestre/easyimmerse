/** The parts of a video element that capturing a frame uses, so that tests can pass a fake. */
export type FrameSource = {
  currentTime: number;
  videoWidth: number;
  videoHeight: number;
  addEventListener(type: "seeked", listener: () => void): void;
  removeEventListener(type: "seeked", listener: () => void): void;
};

export type CaptureFrameOptions = {
  /** The element time to seek to first. Without one the current frame is captured. */
  seekToSeconds?: number;
  /** How long to wait for the seek to finish before capturing anyway. */
  seekTimeoutMs?: number;
  /** The widest image to return. A wider picture is scaled down to this width, keeping its proportions. */
  maxWidthPx?: number;
  /** Replaces the document's canvas, for tests. */
  createCanvas?: () => HTMLCanvasElement;
};

const defaultSeekTimeoutMs = 3000;

/**
 * Draws the video's frame to a canvas and returns it as a JPEG data URL.
 * When a seek is asked for, the capture waits for the element's `seeked` event, with a timeout,
 * so that the drawn frame is the one at the new time.
 */
export async function captureVideoFrame(
  video: FrameSource,
  options: CaptureFrameOptions = {},
): Promise<string> {
  if (options.seekToSeconds !== undefined)
    await seekAndWait(
      video,
      options.seekToSeconds,
      options.seekTimeoutMs ?? defaultSeekTimeoutMs,
    );
  return drawFrame(
    video,
    options.maxWidthPx ?? video.videoWidth,
    options.createCanvas ?? createDocumentCanvas,
  );
}

function seekAndWait(
  video: FrameSource,
  seconds: number,
  timeoutMs: number,
): Promise<void> {
  return new Promise((resolve) => {
    const finish = () => {
      clearTimeout(timer);
      video.removeEventListener("seeked", finish);
      resolve();
    };
    const timer = setTimeout(finish, timeoutMs);
    video.addEventListener("seeked", finish);
    video.currentTime = seconds;
  });
}

function drawFrame(
  video: FrameSource,
  maxWidthPx: number,
  createCanvas: () => HTMLCanvasElement,
): string {
  const scale = Math.min(1, maxWidthPx / video.videoWidth);
  const canvas = createCanvas();
  canvas.width = Math.round(video.videoWidth * scale);
  canvas.height = Math.round(video.videoHeight * scale);
  const context = canvas.getContext("2d");
  if (context === null) throw new Error("The canvas has no 2D context.");
  context.drawImage(
    video as unknown as CanvasImageSource,
    0,
    0,
    canvas.width,
    canvas.height,
  );
  return canvas.toDataURL("image/jpeg", 0.92);
}

function createDocumentCanvas(): HTMLCanvasElement {
  return document.createElement("canvas");
}
