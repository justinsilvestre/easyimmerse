import type {
  FlashcardDraft,
  MediaFile,
  ProjectSettings,
} from "@easyimmerse/types";
import { mediaNameTag } from "./mediaNameTag.ts";
import { addTags } from "./parseTags.ts";

/**
 * Starts a flashcard for a word from an ebook or a text file under the project's flashcard settings, with the sentence around the word as its context.
 * The context's translation is the passage of the book's translation aligned with it, where there is one.
 * The file has no sound or pictures, so the card has no audio clip or screenshot.
 */
export function draftFromText({
  word,
  sentence,
  sentenceTranslation = "",
  mediaFile,
  settings,
}: {
  word: string;
  sentence: string;
  /** The translation of the passage the word lies in, or an empty string where the book has none. */
  sentenceTranslation?: string;
  mediaFile: MediaFile;
  settings: ProjectSettings;
}): FlashcardDraft {
  return {
    media_file_id: mediaFile.id,
    cue_index: null,
    word_start: null,
    content: {
      word,
      word_pronunciation: "",
      l1_definition: "",
      l2_definition: "",
      text_context: sentence,
      text_context_translation: sentenceTranslation,
      text_context_pronunciation: "",
      audio_context: null,
      screenshot: null,
      tags: settings.tags_media_name
        ? addTags(settings.default_tags, [mediaNameTag(mediaFile.name)])
        : [...settings.default_tags],
    },
    included_fields: [...settings.flashcard_fields],
  };
}
