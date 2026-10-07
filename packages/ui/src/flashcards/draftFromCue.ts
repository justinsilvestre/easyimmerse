import type {
  AudioClip,
  Cue,
  FlashcardDraft,
  MediaFile,
  ProjectSettings,
  Screenshot,
} from "@easyimmerse/types";
import { stripMarkup } from "../components/ClickableText.tsx";
import { mediaNameTag } from "./mediaNameTag.ts";
import { addTags } from "./parseTags.ts";

/**
 * Starts a flashcard for a word from a subtitle cue under the project's flashcard settings:
 * the cue is the sentence, its timing the audio clip, and its middle the moment of the screenshot when the media file is known to show pictures.
 * The word's pronunciation and definitions are left empty, for the caller to fill from a dictionary or the user to type.
 */
export function draftFromCue({
  word,
  cue,
  translationCue,
  mediaFile,
  settings,
  hasScreenshots,
}: {
  word: string;
  cue: Cue | null;
  translationCue: Cue | null;
  mediaFile: MediaFile;
  settings: ProjectSettings;
  hasScreenshots: boolean;
}): FlashcardDraft {
  return {
    media_file_id: mediaFile.id,
    cue_index: cue?.index ?? null,
    word_start: null,
    content: {
      word,
      word_pronunciation: "",
      l1_definition: "",
      l2_definition: "",
      text_context: cue ? stripMarkup(cue.text) : "",
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

/** The screenshot a new flashcard starts with: the frame in the middle of its clip. */
export function screenshotForClip(clip: AudioClip): Screenshot {
  return { at_ms: Math.round((clip.start_ms + clip.end_ms) / 2) };
}
