import type { FlashcardContent } from "@easyimmerse/types";
import { type EditedFlashcard, segmentIdOf } from "./editedFlashcard.ts";
import { type EditorAction, moveClipEndpoint } from "./editFlashcard.ts";

/** A change to a flashcard's timing, applied to whichever content the flashcard has. */
export type Retiming = (content: FlashcardContent) => FlashcardContent;

/**
 * Moves a flashcard's clip edges and screenshot time from the waveform.
 * The open card changes only in the editor, to be saved with the rest of it; any other card is retimed at once through `retimeNow`.
 */
export function flashcardRetiming(
  edited: EditedFlashcard | null,
  edit: (action: EditorAction) => void,
  retimeNow: (id: string, retiming: Retiming) => void,
) {
  const isOpen = (id: string) => edited !== null && segmentIdOf(edited) === id;
  return {
    moveClipEndpoint: (id: string, endpoint: "start" | "end", ms: number) => {
      const retiming: Retiming = (content) =>
        content.audio_context === null
          ? content
          : {
              ...content,
              audio_context: moveClipEndpoint(
                content.audio_context,
                endpoint,
                ms,
              ),
            };
      const openClip = isOpen(id) && edited?.editor.content.audio_context;
      if (openClip)
        return edit({
          type: "clipChanged",
          clip: moveClipEndpoint(openClip, endpoint, ms),
        });
      if (!isOpen(id)) retimeNow(id, retiming);
    },
    moveScreenshot: (id: string, ms: number) => {
      const atMs = Math.round(ms);
      if (isOpen(id)) return edit({ type: "screenshotMsChanged", ms: atMs });
      retimeNow(id, (content) => ({ ...content, screenshot: { at_ms: atMs } }));
    },
  };
}
