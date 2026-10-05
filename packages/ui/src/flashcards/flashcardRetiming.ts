import type { Flashcard, FlashcardDraft } from "@easyimmerse/types";
import { type EditedFlashcard, segmentIdOf } from "./editedFlashcard.ts";
import { type EditorAction, moveClipEndpoint } from "./editFlashcard.ts";

/**
 * Moves a flashcard's clip edges and screenshot time from the waveform.
 * The open card changes only in the editor, to be saved with the rest of it; any other card is saved at once through `replaceNow`.
 */
export function flashcardRetiming(
  flashcards: readonly Flashcard[],
  edited: EditedFlashcard | null,
  edit: (action: EditorAction) => void,
  replaceNow: (flashcard: Flashcard, changes: Partial<FlashcardDraft>) => void,
) {
  const find = (id: string) =>
    flashcards.find((flashcard) => flashcard.id === id);
  const isOpen = (id: string) => edited !== null && segmentIdOf(edited) === id;
  return {
    moveClipEndpoint: (id: string, endpoint: "start" | "end", ms: number) => {
      const content = isOpen(id) ? edited?.editor.content : find(id)?.content;
      const clip = content?.audio_context;
      if (!clip) return;
      const moved = moveClipEndpoint(clip, endpoint, ms);
      if (isOpen(id)) return edit({ type: "clipChanged", clip: moved });
      const flashcard = find(id);
      if (flashcard)
        replaceNow(flashcard, {
          content: { ...flashcard.content, audio_context: moved },
        });
    },
    moveScreenshot: (id: string, ms: number) => {
      const atMs = Math.round(ms);
      if (isOpen(id)) return edit({ type: "screenshotMsChanged", ms: atMs });
      const flashcard = find(id);
      if (flashcard)
        replaceNow(flashcard, {
          content: { ...flashcard.content, screenshot: { at_ms: atMs } },
        });
    },
  };
}
