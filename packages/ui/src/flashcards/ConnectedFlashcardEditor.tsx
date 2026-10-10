import {
  actions,
  isAwaitingLookup,
  saveStatusOf,
  selectFlashcardForm,
} from "@easyimmerse/state";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { selectMediaDurationMs } from "../player/selectMediaDurationMs.ts";
import { FlashcardEditor } from "./FlashcardEditor.tsx";
import type { MediaWaveform } from "./FlashcardEditorFields.tsx";
import type { FlashcardLanguages } from "./flashcardFields.ts";

/** The flashcard editor for the card open in the form, which it reads from the store and edits there; nothing while no card is open. */
export function ConnectedFlashcardEditor({
  languages,
  waveform = null,
  screenshotUrl = null,
}: {
  languages: FlashcardLanguages;
  /** The audio around the card's clip, or null where there is none to draw, as for an ebook. */
  waveform?: MediaWaveform | null;
  /** The image of the screenshot at its current time, or null when none can be shown. */
  screenshotUrl?: string | null;
}) {
  const dispatch = useAppDispatch();
  const form = useAppSelector((state) => selectFlashcardForm(state.app));
  const mediaDurationMs = useAppSelector(selectMediaDurationMs);
  if (form === null) return null;
  return (
    <FlashcardEditor
      key={form.card.kind === "new" ? "new" : form.card.flashcard.id}
      state={form.card.editor}
      dispatch={(action) => dispatch(actions.flashcardEdited(action))}
      languages={languages}
      waveform={waveform}
      screenshotUrl={screenshotUrl}
      mediaDurationMs={mediaDurationMs}
      saveStatus={saveStatusOf(form.stage)}
      isNew={form.card.kind === "new"}
      isAwaitingLookup={isAwaitingLookup(form.stage)}
      hasSaveFailed={form.saveFailure !== null}
      onSave={() => dispatch(actions.flashcardSaveRequested())}
      onDelete={() => dispatch(actions.flashcardDeleteRequested())}
      onClose={() => dispatch(actions.flashcardClosed())}
      onPlayClip={(clip) => dispatch(actions.clipPlayRequested(clip))}
    />
  );
}
