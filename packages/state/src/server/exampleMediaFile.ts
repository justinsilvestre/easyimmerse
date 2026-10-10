import type { MediaFile } from "@easyimmerse/types";

/** Returns a media file of project p1 for tests, with the given id and name and a path under /videos. */
export function exampleMediaFile(id: string, name: string): MediaFile {
  return {
    id,
    project_id: "p1",
    name,
    source: { kind: "path", path: `/videos/${name}` },
    created_at_ms: 0,
    track_selection_json: null,
    origin: null,
  };
}
