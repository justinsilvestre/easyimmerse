import type { Flashcard } from "@easyimmerse/types";
import { actions } from "../app/appAction.ts";
import { exampleListedFlashcard } from "../flashcards/exampleFlashcards.ts";
import type { ServerCacheSlice } from "../server/cacheEntry.ts";
import { exampleMediaFile } from "../server/exampleMediaFile.ts";
import { exampleProject } from "../server/exampleProject.ts";
import { serverCacheWith } from "../server/serverCacheWith.ts";

/** Returns a listed flashcard of p1, made from a media file at a time, and exported, sent and edited as given, for tests. */
export function ankiFlashcard(
  id: string,
  mediaFileId: string | null,
  createdAtMs: number,
  sentAs: {
    exportedAtMs?: number;
    sentAtMs?: number;
    updatedAtMs?: number;
  } = {},
): Flashcard {
  return {
    ...exampleListedFlashcard(id, id, sentAs.updatedAtMs ?? createdAtMs),
    media_file_id: mediaFileId,
    created_at_ms: createdAtMs,
    exported_at_ms: sentAs.exportedAtMs ?? null,
    was_packaged: sentAs.exportedAtMs !== undefined,
    sent_at_ms: sentAs.sentAtMs ?? null,
    is_suspended: false,
  };
}

/** Three flashcards of p1: f3 and then f1 from m1, never exported or sent, and f2 from m2, exported and sent. */
export const exampleAnkiFlashcards: readonly Flashcard[] = [
  ankiFlashcard("f1", "m1", 2),
  ankiFlashcard("f2", "m2", 3, { exportedAtMs: 10, sentAtMs: 100 }),
  ankiFlashcard("f3", "m1", 1),
];

/** A server cache holding p1, named "Korean", using AnkiConnect or not, with its media files m1 and m2 and its flashcards, for tests. */
export function ankiCache(
  usesAnkiConnect: boolean,
  flashcards: readonly Flashcard[] = exampleAnkiFlashcards,
): ServerCacheSlice {
  const project = {
    ...exampleProject("p1"),
    uses_anki_connect: usesAnkiConnect,
  };
  const mediaFiles = [
    exampleMediaFile("m1", "pilot.mkv"),
    exampleMediaFile("m2", "episode.mkv"),
  ];
  return serverCacheWith(
    "getProject",
    "p1",
    project,
    serverCacheWith(
      "listMediaFiles",
      "p1",
      { media_files: mediaFiles },
      serverCacheWith("listFlashcards", "p1", { flashcards: [...flashcards] }),
    ),
  );
}

/** Opens the overview of p1. */
export const openOverview = actions.navigated({
  type: "openProject",
  projectId: "p1",
});
