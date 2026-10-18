import {
  type EditorAction,
  type FlashcardForm,
  moveClipEndpoint,
  segmentIdOf,
} from "@easyimmerse/state";

/**
 * Moves the open card's clip edges and screenshot time from the waveform's handles, with the same effect as editing them in the form.
 * `formNow` gives the form as it is when a handle moves.
 * The waveform offers only the open card's handles, so a move reported for any other card is ignored.
 */
export function flashcardRetiming(
  formNow: () => FlashcardForm | null,
  edit: (action: EditorAction) => void,
) {
  const openForm = (id: string) => {
    const form = formNow();
    return form !== null && segmentIdOf(form.card) === id ? form : null;
  };
  return {
    moveClipEndpoint: (id: string, endpoint: "start" | "end", ms: number) => {
      const openClip = openForm(id)?.card.editor.content.audio_context;
      if (openClip)
        edit({
          type: "clipChanged",
          clip: moveClipEndpoint(openClip, endpoint, ms),
        });
    },
    moveScreenshot: (id: string, ms: number) => {
      if (openForm(id))
        edit({ type: "screenshotMsChanged", ms: Math.round(ms) });
    },
  };
}
