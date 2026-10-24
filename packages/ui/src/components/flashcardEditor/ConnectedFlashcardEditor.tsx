import { useGetProjectQuery } from "@easyimmerse/backend";
import {
  actions,
  type FlashcardForm,
  isAwaitingLookup,
  saveStatusOf,
  selectAnkiFateOfDeletion,
  selectIsFlashcardSuspended,
  selectLibraryEdit,
  selectMediaDurationMs,
} from "@easyimmerse/state";
import type { Flashcard } from "@easyimmerse/types";
import { useAppDispatch } from "../../useAppDispatch.ts";
import { useAppSelector } from "../../useAppSelector.ts";
import type { FlashcardLanguages } from "../flashcards/flashcardFields.ts";
import { FlashcardEditor } from "./FlashcardEditor.tsx";
import type { MediaWaveform } from "./FlashcardEditorFields.tsx";
import { LibraryFlashcardView } from "./LibraryFlashcardView.tsx";

/**
 * The flashcard editor for the card open in the form, which it edits, saves and plays through the store.
 * A flashcard made from the library is shown read-only instead, as `LibraryFlashcardView` describes.
 */
export function ConnectedFlashcardEditor({
  form,
  languages,
  waveform = null,
  screenshotUrl = null,
}: {
  /** The form holding the open card, which the caller reads from the store. */
  form: FlashcardForm;
  languages: FlashcardLanguages;
  /** The audio around the card's clip, or null where there is none to draw, as for an ebook. */
  waveform?: MediaWaveform | null;
  /** The image of the screenshot at its current time, or null when none can be shown. */
  screenshotUrl?: string | null;
}) {
  const dispatch = useAppDispatch();
  const mediaDurationMs = useAppSelector(selectMediaDurationMs);
  const saved = form.card.kind === "existing" ? form.card.flashcard : null;
  const ankiFate = useAppSelector((state) =>
    saved === null
      ? null
      : selectAnkiFateOfDeletion(state, saved.project_id, saved.id),
  );
  const isSuspended = useAppSelector(
    (state) =>
      saved !== null &&
      selectIsFlashcardSuspended(state, saved.project_id, saved.id),
  );
  // The card itself says whether it came from the library, so this holds before the project's flashcards are listed.
  if (saved?.is_from_library)
    return (
      <ConnectedLibraryFlashcard
        flashcard={saved}
        isSuspended={isSuspended}
        languages={languages}
        screenshotUrl={screenshotUrl}
      />
    );
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
      ankiFate={ankiFate}
      hasSaveFailed={form.saveFailure !== null}
      hasUnsavedChanges={form.card.isChanged}
      onSave={() => dispatch(actions.flashcardSaveRequested())}
      onDelete={() => dispatch(actions.flashcardDeleteRequested())}
      onUnsuspend={
        saved && isSuspended
          ? () =>
              dispatch(
                actions.flashcardUnsuspendRequested(saved.project_id, saved.id),
              )
          : null
      }
      onClose={() => dispatch(actions.flashcardClosed())}
      onPlayClip={(clip) => dispatch(actions.clipPlayRequested(clip))}
    />
  );
}

/**
 * A flashcard made from the library, read-only, laid out as the project's settings choose,
 * with its clip, its unsuspension and its confirmed deletion through the store.
 */
function ConnectedLibraryFlashcard({
  flashcard,
  isSuspended,
  languages,
  screenshotUrl,
}: {
  flashcard: Flashcard;
  isSuspended: boolean;
  languages: FlashcardLanguages;
  screenshotUrl: string | null;
}) {
  const dispatch = useAppDispatch();
  const settings = useGetProjectQuery(flashcard.project_id).data?.settings;
  const ankiFate = useAppSelector((state) =>
    selectAnkiFateOfDeletion(state, flashcard.project_id, flashcard.id),
  );
  const deletion = useAppSelector((state) => selectLibraryEdit(state).deletion);
  const { project_id: projectId, id: flashcardId } = flashcard;
  const clip = flashcard.content.audio_context;
  if (!settings) return null;
  return (
    <LibraryFlashcardView
      content={flashcard.content}
      settings={settings}
      languages={languages}
      screenshotUrl={screenshotUrl}
      ankiFate={ankiFate}
      isConfirmingDelete={
        deletion?.kind === "flashcard" && deletion.flashcardId === flashcardId
      }
      onPlayAudio={
        clip ? () => dispatch(actions.clipPlayRequested(clip)) : undefined
      }
      onUnsuspend={
        isSuspended
          ? () =>
              dispatch(
                actions.flashcardUnsuspendRequested(projectId, flashcardId),
              )
          : null
      }
      onAskDelete={() =>
        dispatch(
          actions.libraryDeletionAsked({ kind: "flashcard", flashcardId }),
        )
      }
      onCancelDelete={() => dispatch(actions.libraryDeletionAsked(null))}
      onDelete={() => dispatch(actions.flashcardDeleteRequested())}
      onClose={() => dispatch(actions.flashcardClosed())}
    />
  );
}
