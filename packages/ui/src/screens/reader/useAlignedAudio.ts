import {
  useListAlignmentsQuery,
  useListMediaFilesQuery,
} from "@easyimmerse/backend";
import {
  type AlignedAudio,
  selectReaderAlignedAudio,
} from "@easyimmerse/state";
import { useAppSelector } from "../../useAppSelector.ts";

/**
 * The audio the open book is aligned with, by its newest audio alignment, or null while the alignments load
 * or when the book has none. The queries keep the book's alignments and the project's media files in the server cache,
 * from which the store derives the audio, as `selectReaderAlignedAudio` describes.
 */
export function useAlignedAudio(
  projectId: string,
  bookId: string,
): AlignedAudio | null {
  useListMediaFilesQuery(projectId);
  useListAlignmentsQuery({ projectId, mediaFileId: bookId });
  return useAppSelector(selectReaderAlignedAudio);
}
