import { screenshotForClip } from "@easyimmerse/state";
import type {
  Cue,
  FlashcardDraft,
  MediaFile,
  ProjectSettings,
} from "@easyimmerse/types";
import { stripMarkup } from "../components/ClickableText.tsx";
import { mediaNameTag } from "./mediaNameTag.ts";
import { addTags } from "./parseTags.ts";

/**
 * Starts a flashcard for a word from a subtitle cue under the project's flashcard settings:
 * the cue is the sentence, its timing the audio clip, and its middle the moment of the screenshot when the media file is known to show pictures.
 * The word's pronunciation and definitions are left empty, for the caller to fill from a dictionary or the user to type.
 * `wordStart` is where the word was taken from in the cue's text without markup, in UTF-16 code units;
 * the draft keeps it only when the cue holds the word there.
 */
export function draftFromCue({
  word,
  wordStart,
  cue,
  translationCue,
  mediaFile,
  settings,
  hasScreenshots,
}: {
  word: string;
  wordStart: number | null;
  cue: Cue | null;
  translationCue: Cue | null;
  mediaFile: MediaFile;
  settings: ProjectSettings;
  hasScreenshots: boolean;
}): FlashcardDraft {
  const text = cue ? stripMarkup(cue.text) : "";
  return {
    media_file_id: mediaFile.id,
    cue_index: cue?.index ?? null,
    word_start: isWordAt(text, word, wordStart) ? wordStart : null,
    content: {
      word,
      word_pronunciation: "",
      l1_definition: "",
      l2_definition: "",
      text_context: text,
      text_context_translation: translationCue
        ? stripMarkup(translationCue.text)
        : "",
      text_context_pronunciation: "",
      audio_context: cue
        ? { start_ms: cue.start_ms, end_ms: cue.end_ms }
        : null,
      screenshot: cue && hasScreenshots ? screenshotForClip(cue) : null,
      tags: settings.tags_media_name
        ? addTags(settings.default_tags, [mediaNameTag(mediaFile.name)])
        : [...settings.default_tags],
    },
    included_fields: [...settings.flashcard_fields],
  };
}

function isWordAt(
  text: string,
  word: string,
  start: number | null,
): start is number {
  return start !== null && word !== "" && text.startsWith(word, start);
}
