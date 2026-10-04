import type {
  Cue,
  Flashcard,
  FlashcardFieldKey,
  SaveFlashcardRequest,
} from "@easyimmerse/types";
import type { FlashcardSegment } from "../../components/waveform/flashcardSegment.ts";
import type { FlashcardContent } from "../../flashcards/flashcardFields.ts";

/** The waveform segment id of a flashcard that has not been saved yet. */
export const unsavedFlashcardId = "unsaved";

/** The flashcard open in the editor: a saved one by its id, or a new one. */
export type EditedFlashcard = {
  id: string;
  clip: FlashcardContent["audio_context"];
  screenshotMs: number | null;
};

/**
 * The waveform segments of the flashcards that have an audio clip. The flashcard open in the editor
 * is drawn where the editor has moved it, and a new one is added.
 */
export function segmentsOfFlashcards(
  flashcards: readonly Flashcard[],
  edited: EditedFlashcard | null,
): FlashcardSegment[] {
  const segments = flashcards
    .filter((flashcard) => flashcard.id !== edited?.id)
    .flatMap((flashcard) =>
      segmentOf(
        flashcard.id,
        flashcard.fields.audio_context,
        flashcard.fields.screenshot_at_ms,
      ),
    );
  if (edited === null) return segments;
  return [
    ...segments,
    ...segmentOf(edited.id, edited.clip, edited.screenshotMs),
  ];
}

function segmentOf(
  id: string,
  clip: FlashcardContent["audio_context"],
  screenshotMs: number | null,
): FlashcardSegment[] {
  if (clip === null) return [];
  return [
    {
      id,
      startMs: clip.start_ms,
      endMs: clip.end_ms,
      screenshotMs: screenshotMs ?? (clip.start_ms + clip.end_ms) / 2,
    },
  ];
}

/** The indexes of the cues whose middle lies within a flashcard's clip. */
export function cueIndexesWithFlashcards(
  cues: readonly Cue[],
  segments: readonly FlashcardSegment[],
): number[] {
  return cues
    .filter((cue) => {
      const middle = (cue.start_ms + cue.end_ms) / 2;
      return segments.some(
        (segment) => segment.startMs <= middle && middle <= segment.endMs,
      );
    })
    .map((cue) => cue.index);
}

/** A saved flashcard as the editor holds it, with the screenshot image the server returned. */
export function contentOfFlashcard(
  flashcard: Flashcard,
  screenshotUrl: string | null,
): FlashcardContent {
  const { screenshot_at_ms, ...fields } = flashcard.fields;
  return {
    ...fields,
    screenshot:
      screenshot_at_ms === null || screenshotUrl === null
        ? null
        : { url: screenshotUrl, at_ms: screenshot_at_ms },
  };
}

/** The request that saves the editor's flashcard. The screenshot image is sent only when it is not the one stored. */
export function saveRequestOf(
  content: FlashcardContent,
  includedFields: readonly FlashcardFieldKey[],
  mediaFileId: string | null,
  storedScreenshotUrl: string | null,
): SaveFlashcardRequest {
  const { screenshot, ...fields } = content;
  return {
    media_file_id: mediaFileId,
    fields: { ...fields, screenshot_at_ms: screenshot?.at_ms ?? null },
    included_fields: [...includedFields],
    screenshot_data_url:
      screenshot && screenshot.url !== storedScreenshotUrl
        ? screenshot.url
        : null,
  };
}
