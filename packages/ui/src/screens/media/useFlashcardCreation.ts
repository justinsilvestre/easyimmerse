import {
  useLazyLookupQuery,
  useListDictionariesQuery,
} from "@easyimmerse/backend";
import type { Cue, LookupEntry, MediaFile, Project } from "@easyimmerse/types";
import type { FlashcardContent } from "../../flashcards/flashcardFields.ts";
import { findTranslationOf } from "../../media/findCue.ts";
import { buildNewFlashcard } from "./buildNewFlashcard.ts";

/** What a new flashcard starts from: a word (empty for a whole cue), the cue, and the entries already looked up, if any. */
export type FlashcardRequest = {
  word: string;
  cue: Cue | null;
  entries: readonly LookupEntry[] | null;
  entryIndex: number | null;
};

/** A new flashcard's content, and the time its screenshot is to be taken at. */
export type NewFlashcard = { content: FlashcardContent; screenshotMs: number };

/**
 * Makes the content of a new flashcard: looks the word up when its entries are not known yet,
 * fills the fields from the project's settings, and picks the screenshot's time: the current time,
 * or the cue's middle when the time is outside the cue.
 */
export function useFlashcardCreation({
  project,
  mediaFile,
  translationCues,
  currentMs,
}: {
  project: Project;
  mediaFile: MediaFile;
  translationCues: readonly Cue[];
  currentMs: number;
}) {
  const [lookUp] = useLazyLookupQuery();
  const dictionaries = useListDictionariesQuery().data?.dictionaries ?? [];
  const language = project.settings.target_language;
  return async (request: FlashcardRequest): Promise<NewFlashcard> => {
    const entries =
      request.entries ??
      (request.word === ""
        ? []
        : await lookUp({ language, term: request.word }, true)
            .unwrap()
            .then((response) => response.entries)
            .catch(() => []));
    const content = buildNewFlashcard(
      {
        word: request.word,
        cue: request.cue,
        translationCue: request.cue
          ? findTranslationOf(request.cue, translationCues)
          : null,
        entries,
        entryIndex: request.entryIndex,
        screenshot: null,
      },
      {
        settings: project.settings,
        dictionaries,
        mediaName: mediaFile.name,
      },
    );
    return { content, screenshotMs: screenshotTimeOf(request.cue, currentMs) };
  };
}

function screenshotTimeOf(cue: Cue | null, currentMs: number): number {
  if (cue === null || (cue.start_ms <= currentMs && currentMs < cue.end_ms))
    return currentMs;
  return (cue.start_ms + cue.end_ms) / 2;
}
