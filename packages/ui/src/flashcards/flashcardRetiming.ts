import {
  type EditorAction,
  type FlashcardForm,
  moveClipEndpoint,
  segmentIdOf,
} from "@easyimmerse/state";

/**
 * Moves the open card's clip edges and screenshot time from the waveform's handles, with the same effect as editing them in the form.
 * The waveform offers only the open card's handles, so a move reported for any other card is ignored.
 */
export function flashcardRetiming(
  form: FlashcardForm | null,
  edit: (action: EditorAction) => void,
) {
  const isOpen = (id: string) => form !== null && segmentIdOf(form.card) === id;
  return {
    moveClipEndpoint: (id: string, endpoint: "start" | "end", ms: number) => {
      const openClip = isOpen(id) && form?.card.editor.content.audio_context;
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
