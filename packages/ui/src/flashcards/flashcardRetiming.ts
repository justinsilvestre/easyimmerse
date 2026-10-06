import { type EditedFlashcard, segmentIdOf } from "./editedFlashcard.ts";
import { type EditorAction, moveClipEndpoint } from "./editFlashcard.ts";

/**
 * Moves the open card's clip edges and screenshot time from the waveform, in the editor only, to be saved with the rest of it.
 * The waveform lets only the open card's handles be dragged, so a move reported for any other card is ignored.
 */
export function flashcardRetiming(
  edited: EditedFlashcard | null,
  edit: (action: EditorAction) => void,
) {
  const isOpen = (id: string) => edited !== null && segmentIdOf(edited) === id;
  return {
    moveClipEndpoint: (id: string, endpoint: "start" | "end", ms: number) => {
      const openClip = isOpen(id) && edited?.editor.content.audio_context;
      if (openClip)
        edit({
          type: "clipChanged",
          clip: moveClipEndpoint(openClip, endpoint, ms),
        });
    },
    moveScreenshot: (id: string, ms: number) => {
      if (isOpen(id)) edit({ type: "screenshotMsChanged", ms: Math.round(ms) });
    },
  };
}
