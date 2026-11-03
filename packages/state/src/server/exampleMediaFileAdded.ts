import type { MediaFileAdded } from "@easyimmerse/types";
import { exampleMediaFile } from "./exampleMediaFile.ts";

/** Returns what adding a media file to project p1 answers in tests: a file with the given id and name, new unless said otherwise. */
export function exampleMediaFileAdded(
  id: string,
  name: string,
  wasAlreadyInProject = false,
): MediaFileAdded {
  return {
    ...exampleMediaFile(id, name),
    was_already_in_project: wasAlreadyInProject,
  };
}
