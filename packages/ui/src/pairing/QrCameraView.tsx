import { useEffect, useEffectEvent, useRef } from "react";
import { Button } from "../components/Button.tsx";

/** How long the view waits between two attempts to find a QR code in the picture. */
const scanIntervalMs = 300;

/** The part of the browser's `BarcodeDetector` that reading QR codes uses; TypeScript's DOM types do not describe it yet. */
type QrDetector = {
  detect(source: HTMLVideoElement): Promise<{ rawValue: string }[]>;
};

type QrDetectorConstructor = new (options: { formats: string[] }) => QrDetector;

/**
 * The browser's camera picture, which reports the text of the first QR code it finds.
 * It reports a cancellation when the person closes it or the camera cannot be used.
 * The camera is a side effect of the page that no store can hold, so this view starts and stops it itself.
 */
export function QrCameraView({
  onScanned,
  onCancel,
}: {
  onScanned: (text: string) => void;
  onCancel: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const scanned = useEffectEvent(onScanned);
  const cancelled = useEffectEvent(onCancel);
  useEffect(() => {
    const video = videoRef.current;
    if (video === null) return;
    return watchForQrCode(video, scanned, cancelled);
  }, []);
  return (
    <div className="flex flex-col items-start gap-2">
      <video
        ref={videoRef}
        muted
        playsInline
        aria-label="Camera"
        className="aspect-square w-64 rounded-lg bg-black object-cover"
      />
      <Button size="sm" onClick={onCancel}>
        Close the camera
      </Button>
    </div>
  );
}

/** Shows the back camera in the video and looks for a QR code in it until one is found. Returns a function that stops the camera. */
function watchForQrCode(
  video: HTMLVideoElement,
  onFound: (text: string) => void,
  onFailed: () => void,
): () => void {
  let isStopped = false;
  let stream: MediaStream | null = null;
  const Detector = (globalThis as { BarcodeDetector?: QrDetectorConstructor })
    .BarcodeDetector;
  const look = async (detector: QrDetector) => {
    while (!isStopped) {
      const [found] = await detector.detect(video).catch(() => []);
      if (found) return onFound(found.rawValue);
      await new Promise((resolve) => setTimeout(resolve, scanIntervalMs));
    }
  };
  if (Detector === undefined) {
    onFailed();
    return () => undefined;
  }
  navigator.mediaDevices
    .getUserMedia({ video: { facingMode: "environment" } })
    .then(async (opened) => {
      stream = opened;
      if (isStopped) return stopTracks(opened);
      video.srcObject = opened;
      await video.play();
      await look(new Detector({ formats: ["qr_code"] }));
    })
    .catch(() => {
      if (!isStopped) onFailed();
    });
  return () => {
    isStopped = true;
    if (stream !== null) stopTracks(stream);
  };
}

function stopTracks(stream: MediaStream): void {
  for (const track of stream.getTracks()) track.stop();
}
