import {
  buildMediaFrameUrl,
  isSamePickedFile,
  skipToken,
  useCaptureFrameQuery,
} from "@easyimmerse/backend";
import type { ScreenshotSource } from "./useScreenshotSource.ts";

/**
 * The image of the screenshot at a time, or null without a source or a time, or while a frame the browser captures is not ready.
 * While the frame at a new time is captured, the last frame shown from the same file stays shown.
 */
export function useScreenshotUrl(
  source: ScreenshotSource | null,
  atMs: number | null,
): string | null {
  const browserFile = source?.kind === "browser" ? source.file : null;
  // `data` is the last frame received at any time, so that the frame shown stays while the next one is captured.
  const { data: frame } = useCaptureFrameQuery(
    browserFile && atMs !== null ? { file: browserFile, atMs } : skipToken,
  );
  if (source === null || atMs === null) return null;
  if (source.kind === "browser")
    return frame && isSamePickedFile(frame.file, source.file)
      ? frame.url
      : null;
  return buildMediaFrameUrl(
    source.server,
    source.projectId,
    source.mediaFileId,
    atMs,
  );
}
