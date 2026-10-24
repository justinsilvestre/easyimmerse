import { useListMediaFilesQuery } from "@easyimmerse/backend";
import type { MediaFile } from "@easyimmerse/types";

/** The project's media file with the id, or null until the list has loaded or when it is not in the project. */
export function useMediaFile(
  projectId: string,
  mediaFileId: string,
): MediaFile | null {
  const { data } = useListMediaFilesQuery(projectId);
  return data?.media_files.find((file) => file.id === mediaFileId) ?? null;
}
