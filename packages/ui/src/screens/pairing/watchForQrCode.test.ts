import { describe, expect, it, vi } from "vitest";
import {
  type QrScanScope,
  type QrVideo,
  watchForQrCode,
} from "./watchForQrCode.ts";

const pairingUrl = "http://192.168.1.5:8787/#pair=123456";

function createVideo(): QrVideo {
  return { srcObject: null, play: async () => undefined };
}

/** A camera stream that records whether its one track was stopped. */
function createStream() {
  const track = {
    isStopped: false,
    stop: () => {
      track.isStopped = true;
    },
  };
  const stream = { getTracks: () => [track] } as unknown as MediaStream;
  return { stream, track };
}

/** A browser whose camera opens as given and whose barcode detector finds the codes, one list per attempt. */
function scopeWith(
  openCamera: () => Promise<MediaStream>,
  findings: string[][] = [[pairingUrl]],
): QrScanScope {
  let attempt = 0;
  return {
    BarcodeDetector: class {
      async detect() {
        const found = findings[Math.min(attempt++, findings.length - 1)] ?? [];
        return found.map((rawValue) => ({ rawValue }));
      }
    },
    navigator: { mediaDevices: { getUserMedia: openCamera } },
  };
}

const refused = async (): Promise<MediaStream> => {
  throw new DOMException("Permission denied", "NotAllowedError");
};

describe("watchForQrCode", () => {
  it("reports the text of the QR code it finds", async () => {
    const onFound = vi.fn();
    const { stream } = createStream();
    watchForQrCode(
      createVideo(),
      scopeWith(async () => stream),
      onFound,
      vi.fn(),
    );
    await vi.waitFor(() => expect(onFound).toHaveBeenCalledWith(pairingUrl));
  });

  it("shows the camera's picture in the video", async () => {
    const video = createVideo();
    const { stream } = createStream();
    watchForQrCode(
      video,
      scopeWith(async () => stream),
      vi.fn(),
      vi.fn(),
    );
    await vi.waitFor(() => expect(video.srcObject).toBe(stream));
  });

  it("reports a refused camera as unavailable", async () => {
    const onCameraUnavailable = vi.fn();
    watchForQrCode(
      createVideo(),
      scopeWith(refused),
      vi.fn(),
      onCameraUnavailable,
    );
    await vi.waitFor(() => expect(onCameraUnavailable).toHaveBeenCalled());
  });

  it("reports a browser without a barcode detector as unavailable", () => {
    const onCameraUnavailable = vi.fn();
    watchForQrCode(
      createVideo(),
      { navigator: { mediaDevices: { getUserMedia: refused } } },
      vi.fn(),
      onCameraUnavailable,
    );
    expect(onCameraUnavailable).toHaveBeenCalled();
  });

  it("turns the camera off when stopped", async () => {
    const video = createVideo();
    const { stream, track } = createStream();
    const stop = watchForQrCode(
      video,
      scopeWith(async () => stream, [[]]),
      vi.fn(),
      vi.fn(),
    );
    await vi.waitFor(() => expect(video.srcObject).toBe(stream));
    stop();
    expect(track.isStopped).toBe(true);
  });

  it("reports nothing after it was stopped", async () => {
    const onCameraUnavailable = vi.fn();
    const stop = watchForQrCode(
      createVideo(),
      scopeWith(refused),
      vi.fn(),
      onCameraUnavailable,
    );
    stop();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(onCameraUnavailable).not.toHaveBeenCalled();
  });
});
