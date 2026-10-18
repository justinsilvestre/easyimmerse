import { moveClipEndpoint } from "./editFlashcard.ts";
import { segmentIdOf } from "./flashcardCard.ts";
import type { FlashcardForm } from "./flashcardForm.ts";
import { editForm } from "./flashcardFormSaving.ts";

/**
 * Moves one end of the open card's clip from a drag of its waveform handle, with the same effect as editing the clip in the form.
 * The waveform offers only the open card's handles, so a drag reported for any other card's segment is ignored.
 */
export function dragClipEndpoint(
  form: FlashcardForm,
  drag: { segmentId: string; endpoint: "start" | "end"; ms: number },
): FlashcardForm {
  const clip = form.card.editor.content.audio_context;
  if (!isOpenSegment(form, drag.segmentId) || clip === null) return form;
  return editForm(form, {
    type: "clipChanged",
    clip: moveClipEndpoint(clip, drag.endpoint, drag.ms),
  });
}

/** Moves the open card's screenshot time from a drag of its waveform marker. A drag of any other card's marker is ignored. */
export function dragScreenshotMarker(
  form: FlashcardForm,
  drag: { segmentId: string; ms: number },
): FlashcardForm {
  if (!isOpenSegment(form, drag.segmentId)) return form;
  return editForm(form, {
    type: "screenshotMsChanged",
    ms: Math.round(drag.ms),
  });
}

function isOpenSegment(form: FlashcardForm, segmentId: string) {
  return segmentIdOf(form.card) === segmentId;
}
