import type {
  Cue,
  DictionarySummary,
  LookupEntry,
  ProjectSettings,
} from "@easyimmerse/types";
import { stripMarkup } from "../../components/ClickableText.tsx";
import type {
  FlashcardContent,
  Screenshot,
} from "../../flashcards/flashcardFields.ts";
import { addTags } from "../../flashcards/parseTags.ts";

/** What a new flashcard is made from: a word, the cue it was found in, and what the dictionaries say about it. */
export type FlashcardSource = {
  word: string;
  cue: Cue | null;
  translationCue: Cue | null;
  /** The dictionary entries found for the word. */
  entries: readonly LookupEntry[];
  /** The entry the flashcard was made from, or null to use all of them. */
  entryIndex: number | null;
  screenshot: Screenshot | null;
};

/** Where the project files what a new flashcard needs from beyond its source. */
export type FlashcardContext = {
  settings: ProjectSettings;
  dictionaries: readonly DictionarySummary[];
  /** The name of the media file, for the media name tag. Null without one. */
  mediaName: string | null;
};

/**
 * Fills a new flashcard: the word and its definitions from the dictionary entries, split by the
 * language they are written in; the sentence, its translation, and its audio from the cues; and the tags.
 */
export function buildNewFlashcard(
  source: FlashcardSource,
  context: FlashcardContext,
): FlashcardContent {
  const entries = chosenEntries(source.entries, source.entryIndex);
  const definitionsIn = (language: string) =>
    describeEntries(entries, context.dictionaries, language);
  return {
    word:
      entries.length === 1
        ? (entries[0]?.entry.term ?? source.word)
        : source.word,
    word_pronunciation:
      entries.find((found) => found.entry.reading)?.entry.reading ?? "",
    l1_definition: definitionsIn(context.settings.translation_language),
    l2_definition: definitionsIn(context.settings.target_language),
    text_context: source.cue ? stripMarkup(source.cue.text) : "",
    text_context_translation: source.translationCue
      ? stripMarkup(source.translationCue.text)
      : "",
    text_context_pronunciation: "",
    audio_context: source.cue
      ? { start_ms: source.cue.start_ms, end_ms: source.cue.end_ms }
      : null,
    screenshot: source.screenshot,
    tags: tagsOf(context),
  };
}

function chosenEntries(
  entries: readonly LookupEntry[],
  entryIndex: number | null,
): readonly LookupEntry[] {
  if (entryIndex === null) return entries;
  const chosen = entries[entryIndex];
  return chosen ? [chosen] : [];
}

/** Joins the definitions of the entries from dictionaries written in the language, one entry per line. */
function describeEntries(
  entries: readonly LookupEntry[],
  dictionaries: readonly DictionarySummary[],
  language: string,
): string {
  return entries
    .filter(
      (found) =>
        dictionaries.find((dictionary) => dictionary.id === found.dictionary_id)
          ?.target_language === language,
    )
    .map((found) => found.entry.definitions.join("; "))
    .join("\n");
}

function tagsOf({ settings, mediaName }: FlashcardContext): string[] {
  if (!settings.tags_media_name || mediaName === null)
    return [...settings.default_tags];
  return addTags(settings.default_tags, [mediaNameTag(mediaName)]);
}

/** Turns a media file's name into a tag: without its extension, in lower case, with dashes for spaces. */
export function mediaNameTag(mediaName: string): string {
  return mediaName
    .replace(/\.[^.]+$/, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
}
