/** How long the watch waits between two attempts to find a QR code in the picture. */
const scanIntervalMs = 300;

/** The video that shows the camera's picture, as far as watching it for QR codes uses it. */
export type QrVideo = Pick<HTMLVideoElement, "srcObject" | "play">;

/** The part of the browser's `BarcodeDetector` that reading QR codes uses; TypeScript's DOM types do not describe it yet. */
type QrDetector = {
  detect(source: QrVideo): Promise<{ rawValue: string }[]>;
};

/** What the browser offers for reading QR codes through its camera. */
export type QrScanScope = {
  BarcodeDetector?: new (options: { formats: string[] }) => QrDetector;
  navigator: { mediaDevices: Pick<MediaDevices, "getUserMedia"> };
};

/**
 * Shows the back camera in the video and looks for a QR code in it until it finds one, whose text it reports.
 * It reports instead when the browser has no barcode detector or the camera cannot be used.
 * Returns a function that stops looking and turns the camera off.
 */
export function watchForQrCode(
  video: QrVideo,
  scope: QrScanScope,
  onFound: (text: string) => void,
  onCameraUnavailable: () => void,
): () => void {
  const Detector = scope.BarcodeDetector;
  if (Detector === undefined) {
    onCameraUnavailable();
    return () => undefined;
  }
  let isStopped = false;
  let stream: MediaStream | null = null;
  const lookForCode = async (detector: QrDetector) => {
    while (!isStopped) {
      const [found] = await detector.detect(video).catch(() => []);
      if (found) return onFound(found.rawValue);
      await new Promise((resolve) => setTimeout(resolve, scanIntervalMs));
    }
  };
  scope.navigator.mediaDevices
    .getUserMedia({ video: { facingMode: "environment" } })
    .then(async (opened) => {
      stream = opened;
      if (isStopped) return stopTracks(opened);
      video.srcObject = opened;
      await video.play();
      await lookForCode(new Detector({ formats: ["qr_code"] }));
    })
    .catch(() => {
      if (!isStopped) onCameraUnavailable();
    });
  return () => {
    isStopped = true;
    if (stream !== null) stopTracks(stream);
  };
}

function stopTracks(stream: MediaStream): void {
  for (const track of stream.getTracks()) track.stop();
}
