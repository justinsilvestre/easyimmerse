import { getServerConfig, type ServerConfig } from "@easyimmerse/backend";
import type { MediaFile } from "@easyimmerse/types";
import { useBrowserFileRegistry } from "../browserFileRegistryContext.ts";
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

/** The source of the media file's screenshots, or null when the file has no pictures or none can be reached. */
export function useScreenshotSource(
  projectId: string,
  mediaFile: MediaFile | null,
): ScreenshotSource | null {
  const hasVideo = useHasVideo(projectId, mediaFile);
  const registry = useBrowserFileRegistry();
  if (mediaFile === null || !hasVideo) return null;
  const { source } = mediaFile;
  if (source.kind === "browser_file") {
    const file = registry?.find(mediaFile.name, source) ?? null;
    return file && { kind: "browser", file };
  }
  const server = getServerConfig();
  if (source.kind !== "path" || server === null) return null;
  return { kind: "server", server, projectId, mediaFileId: mediaFile.id };
}
