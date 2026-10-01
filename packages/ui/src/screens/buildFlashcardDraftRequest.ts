import type { WordHover } from "@easyimmerse/state";
import type {
  Cue,
  DictionaryLookupResult,
  DictionarySummary,
  FlashcardDraftRequest,
  MediaFile,
  ProjectSettings,
  TermEntry,
  TimeRange,
} from "@easyimmerse/types";
import type { PickedEntry } from "../components/DictionaryPopupBody.tsx";
import { findOverlappingCue } from "../cues/findOverlappingCue.ts";
import { stripCueMarkup } from "../cues/stripCueMarkup.ts";
import { formatGlossaryAsText } from "../glossary/formatGlossaryAsText.ts";
import { isSameLanguage } from "../isSameLanguage.ts";

/** The dictionary entries a card draws on: the one the user picked, or every result when the user picked none. */
export type DraftDefinitions = {
  picked: PickedEntry | null;
  results: readonly DictionaryLookupResult[];
};

/** The media the word came from, with the translation cues that may hold its context's translation. */
export type DraftMedia = {
  file: MediaFile;
  translationCues: readonly Cue[] | null;
};

type DefinitionSource = {
  dictionary: DictionarySummary;
  entries: readonly TermEntry[];
};

/**
 * Gathers what the app knows about a word into a request for a flashcard draft.
 * Definitions from dictionaries written in the translation language, or in an undeclared language, fill the L1 definition.
 * Definitions from dictionaries written in the target language fill the L2 definition.
 */
export function buildFlashcardDraftRequest(
  hover: WordHover,
  definitions: DraftDefinitions,
  media: DraftMedia,
  settings: ProjectSettings,
): FlashcardDraftRequest {
  const sources = listDefinitionSources(definitions);
  const entries = sources.flatMap((source) => source.entries);
  return {
    word: hover.word,
    lemma: entries[0]?.term ?? null,
    reading: entries.find((entry) => entry.reading)?.reading ?? null,
    l1_definitions: collectDefinitions(sources, (language) =>
      language === null
        ? true
        : isSameLanguage(language, settings.translation_language),
    ),
    l2_definitions: collectDefinitions(
      sources,
      (language) =>
        language !== null && isSameLanguage(language, settings.target_language),
    ),
    context: hover.context,
    context_translation: findContextTranslation(hover.clip, media),
    media_id: media.file.id,
    media_name: media.file.name,
    clip: hover.clip,
    screenshot_ms: findScreenshotTime(hover.clip, media.file),
    settings: settings.flashcard_settings,
  };
}

function listDefinitionSources({
  picked,
  results,
}: DraftDefinitions): DefinitionSource[] {
  if (picked !== null)
    return [{ dictionary: picked.dictionary, entries: [picked.entry] }];
  return results.filter((result) => result.entries.length > 0);
}

/**
 * Collects, as plain text, the definitions of the sources whose dictionary is written in a language the test accepts.
 * Definitions with no text, such as images without a description, are left out.
 */
function collectDefinitions(
  sources: readonly DefinitionSource[],
  acceptsLanguage: (language: string | null) => boolean,
): string[] {
  return sources
    .filter(({ dictionary }) => acceptsLanguage(dictionary.target_language))
    .flatMap(({ entries }) => entries.flatMap((entry) => entry.definitions))
    .map(formatGlossaryAsText)
    .filter((definition) => definition !== "");
}

function findContextTranslation(
  clip: TimeRange | null,
  { translationCues }: DraftMedia,
): string | null {
  if (clip === null || translationCues === null) return null;
  const cue = findOverlappingCue(translationCues, clip);
  return cue && stripCueMarkup(cue.text);
}

function findScreenshotTime(
  clip: TimeRange | null,
  file: MediaFile,
): number | null {
  if (clip === null || file.kind !== "video") return null;
  return Math.round((clip.start_ms + clip.end_ms) / 2);
}
