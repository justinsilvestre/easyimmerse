import { useEffect, useEffectEvent, useRef } from "react";
import { Button } from "../../components/common/Button.tsx";
import { type QrScanScope, watchForQrCode } from "./watchForQrCode.ts";

/**
 * Shows the browser's camera and reports the text of the first QR code it sees.
 * It reports when the person closes the camera, and when the camera cannot be used.
 * The camera is a side effect of the page that no store can hold, so this view turns it on and off itself.
 */
export function QrCameraView({
  onScanned,
  onClose,
  onCameraUnavailable,
}: {
  onScanned: (text: string) => void;
  onClose: () => void;
  onCameraUnavailable: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const reportCode = useEffectEvent(onScanned);
  const reportCameraUnavailable = useEffectEvent(onCameraUnavailable);
  useEffect(() => {
    const video = videoRef.current;
    if (video === null) return;
    return watchForQrCode(
      video,
      globalThis as unknown as QrScanScope,
      reportCode,
      reportCameraUnavailable,
    );
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
      <Button size="sm" onClick={onClose}>
        Close the camera
      </Button>
    </div>
  );
}
