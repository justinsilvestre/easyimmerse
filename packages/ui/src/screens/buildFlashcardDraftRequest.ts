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
import { findOverlappingCue } from "../cues/findOverlappingCue.ts";
import { stripCueMarkup } from "../cues/stripCueMarkup.ts";
import { isSameLanguage } from "../isSameLanguage.ts";

/** The dictionary entries a card draws on: the one the user picked, or every result when the user picked none. */
export type DraftDefinitions = {
  entry: TermEntry | null;
  results: readonly DictionaryLookupResult[];
};

/** The media the word came from, with the translation cues that may hold its context's translation. */
export type DraftMedia = {
  file: MediaFile;
  translationCues: readonly Cue[] | null;
};

type DefinitionSource = {
  /** Null for an entry whose dictionary is not among the results. */
  dictionary: DictionarySummary | null;
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
  entry,
  results,
}: DraftDefinitions): DefinitionSource[] {
  const withEntries = results.filter((result) => result.entries.length > 0);
  if (entry === null) return withEntries;
  const result = withEntries.find((candidate) =>
    candidate.entries.some((other) => isSameEntry(other, entry)),
  );
  return [{ dictionary: result?.dictionary ?? null, entries: [entry] }];
}

function isSameEntry(first: TermEntry, second: TermEntry): boolean {
  return (
    first.term === second.term &&
    first.reading === second.reading &&
    JSON.stringify(first.definitions) === JSON.stringify(second.definitions)
  );
}

/** Collects the definitions of the sources whose dictionary is written in a language the test accepts. */
function collectDefinitions(
  sources: readonly DefinitionSource[],
  acceptsLanguage: (language: string | null) => boolean,
): string[] {
  return sources
    .filter(({ dictionary }) =>
      acceptsLanguage(dictionary?.target_language ?? null),
    )
    .flatMap(({ entries }) => entries.flatMap((entry) => entry.definitions))
    .filter((definition) => typeof definition === "string");
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
