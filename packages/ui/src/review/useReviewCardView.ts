import {
  buildMediaStreamUrl,
  useGetMediaAvailabilityQuery,
  useListMediaFilesQuery,
} from "@easyimmerse/backend";
import { isPlayedByServer, selectServerConfig } from "@easyimmerse/state";
import type { AudioClip, MediaFile, ReviewQueueCard } from "@easyimmerse/types";
import { useBrowserFileRegistry } from "../browserFileRegistryContext.ts";
import { useScreenshotSource } from "../flashcards/useScreenshotSource.ts";
import { useScreenshotUrl } from "../flashcards/useScreenshotUrl.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { useObjectUrl } from "../player/useObjectUrl.ts";
import { mediaIssueOf } from "../projects/mediaIssueOf.ts";
import { pathAvailabilitiesOf } from "../projects/pathAvailabilitiesOf.ts";
import type { ReviewCardView } from "./ReviewCard.tsx";

/**
 * The review card for a card of the queue, with its screenshot and audio clip reached from its media file:
 * through the server for a file it plays, or from the file itself for a file only the browser holds.
 * The media counts as unavailable when the card has a clip or a screenshot and its file is gone from the project,
 * or cannot be read, as the project's media list tells.
 */
export function useReviewCardView(
  projectId: string,
  card: ReviewQueueCard | null,
): ReviewCardView | null {
  const { mediaFile, isMediaUnavailable } = useCardMedia(projectId, card);
  const screenshotUrl = useScreenshotUrl(
    useScreenshotSource(projectId, mediaFile),
    card?.flashcard.content.screenshot?.at_ms ?? null,
  );
  const audioUrl = useClipUrl(
    projectId,
    mediaFile,
    card?.flashcard.content.audio_context ?? null,
  );
  if (card === null) return null;
  return {
    flashcardId: card.flashcard.id,
    content: card.flashcard.content,
    screenshotUrl,
    audioUrl,
    isMediaUnavailable,
  };
}

/**
 * The media file a card's clip and screenshot come from, while it can be read, and whether the card's media cannot be reached.
 * Nothing is known to be unavailable while the project's media files load, or for a card without a clip or a screenshot.
 */
function useCardMedia(projectId: string, card: ReviewQueueCard | null) {
  const mediaFiles = useListMediaFilesQuery(projectId).data?.media_files;
  const availability = useGetMediaAvailabilityQuery(projectId).data;
  const registry = useBrowserFileRegistry();
  const content = card?.flashcard.content;
  const hasMedia = Boolean(content?.audio_context || content?.screenshot);
  const mediaFile = mediaFiles?.find(
    ({ id }) => id === card?.flashcard.media_file_id,
  );
  const isReadable =
    mediaFile !== undefined &&
    mediaIssueOf(mediaFile, registry, pathAvailabilitiesOf(availability)) ===
      undefined;
  return {
    mediaFile: isReadable ? mediaFile : null,
    isMediaUnavailable: hasMedia && mediaFiles !== undefined && !isReadable,
  };
}

/** The URL of a clip of a media file, as a media fragment that plays only the clip. */
function useClipUrl(
  projectId: string,
  mediaFile: MediaFile | null,
  clip: AudioClip | null,
): string | null {
  const server = useAppSelector(selectServerConfig);
  const registry = useBrowserFileRegistry();
  const browserFile =
    mediaFile?.source.kind === "browser_file" && !isPlayedByServer(mediaFile)
      ? (registry?.find(mediaFile.name, mediaFile.source) ?? null)
      : null;
  const browserUrl = useObjectUrl(browserFile);
  if (mediaFile === null || clip === null) return null;
  const url = isPlayedByServer(mediaFile)
    ? server && buildMediaStreamUrl(server, projectId, mediaFile.id)
    : browserUrl;
  return url && `${url}#t=${clip.start_ms / 1000},${clip.end_ms / 1000}`;
}
