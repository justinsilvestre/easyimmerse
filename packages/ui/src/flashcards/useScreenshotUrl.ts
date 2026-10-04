import { buildMediaFrameUrl } from "@easyimmerse/backend";
import { useCapturedFrame } from "../player/useCapturedFrame.ts";
import type { ScreenshotSource } from "./useScreenshotSource.ts";

/** The image of the screenshot at a time, or null without a source or a time, or while a frame the browser captures is not ready. */
export function useScreenshotUrl(
  source: ScreenshotSource | null,
  atMs: number | null,
): string | null {
  const capturedFrame = useCapturedFrame(
    source?.kind === "browser" ? source.file : null,
    atMs,
  );
  if (source === null || atMs === null) return null;
  if (source.kind === "browser") return capturedFrame;
  return buildMediaFrameUrl(
    source.server,
    source.projectId,
    source.mediaFileId,
    atMs,
  );
}
