import type {
  AudioClip,
  Flashcard,
  FlashcardDraft,
  Screenshot,
} from "@easyimmerse/types";
import type { RequestRecord } from "../operations/operations.ts";
import type { FlashcardCard } from "./flashcardCard.ts";
import { flashcardScope } from "./flashcardRequests.ts";

/** What a saved flashcard holds, as the draft that would save it as it is. */
export function draftOfFlashcard(flashcard: Flashcard): FlashcardDraft {
  return {
    media_file_id: flashcard.media_file_id,
    cue_index: flashcard.cue_index,
    word_start: flashcard.word_start,
    content: flashcard.content,
    included_fields: flashcard.included_fields,
  };
}

/**
 * The draft that saves a card as the form holds it.
 * A card whose word was changed keeps where in its cue the word was taken from
 * only while its sentence still holds the new word there.
 */
export function draftOfCard(card: FlashcardCard): FlashcardDraft {
  const base =
    card.kind === "new" ? card.draft : draftOfFlashcard(card.flashcard);
  const { content } = card.editor;
  return {
    ...base,
    word_start: isWordAtStart(base, content.word) ? base.word_start : null,
    content,
    included_fields: [...card.editor.includedFields],
  };
}

/** Returns `listed` with the draft of its latest save among the pending `requests`, or `listed` itself when none is pending. */
export function latestOf(
  listed: Flashcard,
  requests: readonly RequestRecord[],
): Flashcard {
  const draft = latestSaveDraft(requests, listed.id);
  return draft ? withDraft(listed, draft) : listed;
}

/** The screenshot a new flashcard starts with: the frame in the middle of its clip. */
export function screenshotForClip(clip: AudioClip): Screenshot {
  return { at_ms: Math.round((clip.start_ms + clip.end_ms) / 2) };
}

function withDraft(flashcard: Flashcard, draft: FlashcardDraft): Flashcard {
  return { ...flashcard, ...draft };
}

function isWordAtStart(draft: FlashcardDraft, word: string): boolean {
  const start = draft.word_start;
  return start !== null && draft.content.text_context.startsWith(word, start);
}

/** The draft of the latest pending save of a flashcard, or null when no save of it is pending. */
function latestSaveDraft(
  requests: readonly RequestRecord[],
  flashcardId: string,
): FlashcardDraft | null {
  const scope = flashcardScope(flashcardId);
  const saves = requests.flatMap(({ request, scope: recordScope }) =>
    request.kind === "saveFlashcard" && recordScope === scope
      ? [request.draft]
      : [],
  );
  return saves.at(-1) ?? null;
}
