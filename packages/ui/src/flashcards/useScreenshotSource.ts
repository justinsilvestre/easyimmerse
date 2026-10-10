import type { ServerConfig } from "@easyimmerse/state";
import { selectServerConfig } from "@easyimmerse/state";
import type { MediaFile } from "@easyimmerse/types";
import { useBrowserFileRegistry } from "../browserFileRegistryContext.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { useHasPictures } from "../player/useHasPictures.ts";
import { useHasVideo } from "../player/useHasVideo.ts";

/**
 * Where a media file's screenshots are rendered from: the server's frame route for a video on the server's disk,
 * or the file itself for a video the browser holds.
 */
export type ScreenshotSource =
  | {
      kind: "server";
      server: ServerConfig;
      projectId: string;
      mediaFileId: string;
    }
  | { kind: "browser"; file: Blob };

/**
 * The source of the media file's screenshots, or null until the file is known to show pictures, or when none can be reached.
 * A file the browser holds is opened in the background to learn whether it shows pictures.
 */
export function useScreenshotSource(
  projectId: string,
  mediaFile: MediaFile | null,
): ScreenshotSource | null {
  const hasVideo = useHasVideo(projectId, mediaFile);
  const registry = useBrowserFileRegistry();
  const browserFile =
    mediaFile?.source.kind === "browser_file" && hasVideo
      ? (registry?.find(mediaFile.name, mediaFile.source) ?? null)
      : null;
  const hasPictures = useHasPictures(browserFile);
  const server = useAppSelector(selectServerConfig);
  if (mediaFile === null || !hasVideo) return null;
  if (mediaFile.source.kind === "browser_file")
    return browserFile !== null && hasPictures === true
      ? { kind: "browser", file: browserFile }
      : null;
  if (mediaFile.source.kind !== "path" || server === null) return null;
  return { kind: "server", server, projectId, mediaFileId: mediaFile.id };
}
