import type { LibraryItem } from "@easyimmerse/types";

/** A published video item of the library, for tests, with the given fields changed. */
export function exampleLibraryItem(changes: Partial<LibraryItem> = {}) {
  return {
    id: "i1",
    title: "Im Park",
    description: "Two friends talk in a park.",
    language: "de",
    translation_language: "en",
    kind: "video",
    difficulty: "beginner",
    tags: [],
    file_name: "park.mp4",
    duration_ms: 60_000,
    cover_at_ms: null,
    has_cover: true,
    segment_count: 2,
    status: { kind: "published" },
    created_at_ms: 0,
    updated_at_ms: 0,
    ...changes,
  } satisfies LibraryItem;
}
