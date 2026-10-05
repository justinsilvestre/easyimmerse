import { useEffect, useState } from "react";
import { useFrameCapturer } from "./frameCapturerContext.ts";

/**
 * The frame of a file the browser holds at a time, as an image URL, captured in the background.
 * While the frame at a new time is captured, the last frame shown from the same file stays shown.
 * Null without a file or a time, before the first frame arrives, or when the file has no pictures.
 */
export function useCapturedFrame(
  file: Blob | null,
  atMs: number | null,
): string | null {
  const capturer = useFrameCapturer();
  const [latest, setLatest] = useState<{
    file: Blob;
    frame: string | null;
  } | null>(null);
  useEffect(() => {
    if (file === null || atMs === null) return;
    if (capturer.peek(file, atMs) !== undefined) return;
    const controller = new AbortController();
    capturer.capture(file, atMs, controller.signal).then((frame) => {
      if (!controller.signal.aborted && frame !== undefined)
        setLatest({ file, frame });
    });
    return () => controller.abort();
  }, [file, atMs, capturer]);
  if (file === null || atMs === null) return null;
  const known = capturer.peek(file, atMs);
  if (known === undefined) return latest?.file === file ? latest.frame : null;
  // Remembers a frame found already captured, so that it stays shown while the frame at the next time is captured.
  if (latest?.file !== file || latest.frame !== known)
    setLatest({ file, frame: known });
  return known;
}
