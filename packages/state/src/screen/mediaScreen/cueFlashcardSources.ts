import type {
  Cue,
  DictionarySummary,
  MediaFile,
  ProjectSettings,
} from "@easyimmerse/types";
import type { ReadableState } from "../../app/feature.ts";
import type { LookupFieldsContext } from "../../flashcards/flashcardForm.ts";
import type { MediaRoute } from "../../route/route.ts";
import { cacheEntry } from "../../server/cacheEntry.ts";
import { cachedCues } from "./cachedCues.ts";
import { cachedHasPictures } from "./cachedPictures.ts";

const noDictionaries: readonly DictionarySummary[] = [];

/**
 * What the media screen makes a flashcard from a cue with: the file's record, the project's settings,
 * the cues of the chosen tracks in the target language and in the translation language,
 * whether the file is known to show pictures, and what sorts a lookup's definitions into the card's fields.
 */
export type CueFlashcardSources = {
  mediaFile: MediaFile;
  settings: ProjectSettings;
  cues: readonly Cue[];
  translationCues: readonly Cue[];
  hasScreenshots: boolean;
  context: LookupFieldsContext;
};

/**
 * Reads from the server cache what the media screen on `route` makes flashcards from,
 * or null until the cache holds the file's record and the project's settings.
 */
export function cachedCueFlashcardSources(
  app: Pick<ReadableState, "server" | "backend">,
  route: MediaRoute,
): CueFlashcardSources | null {
  const { backend } = app;
  const { projectId, mediaFileId } = route;
  const files = cacheEntry(backend, "listMediaFiles", projectId)?.data;
  const mediaFile = files?.media_files.find(({ id }) => id === mediaFileId);
  const settings = cacheEntry(backend, "getProject", projectId)?.data?.settings;
  if (mediaFile === undefined || settings === undefined) return null;
  const languages = {
    target: settings.target_language,
    translation: settings.translation_language,
  };
  const dictionaries =
    cacheEntry(backend, "listDictionaries", undefined)?.data?.dictionaries ??
    noDictionaries;
  return {
    mediaFile,
    settings,
    ...cachedCues(backend, route),
    hasScreenshots: cachedHasPictures(backend, app.server.config, mediaFile),
    context: { languages, dictionaries },
  };
}
