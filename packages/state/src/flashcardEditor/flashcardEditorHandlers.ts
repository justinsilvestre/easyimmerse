import type { FlashcardFieldKind, NewFlashcard } from "@easyimmerse/types";
import type { AppState } from "../appState.ts";
import { closedLookup, willResumeOnClose } from "../lookup/lookupState.ts";
import { loopPlayer } from "../player/withPlayer.ts";
import type { UpdateHandlers, UpdateResult } from "../updateHandlers.ts";
import { closedFlashcardEditor } from "./flashcardEditorState.ts";
import { toggleFlashcardField } from "./toggleFlashcardField.ts";

export const flashcardEditorHandlers = {
  flashcardEditorOpened: (state, { projectId, card, flashcardId }) => {
    const opened: AppState = {
      ...state,
      lookup: closedLookup,
      flashcardEditor: {
        kind: "editing",
        projectId,
        flashcardId,
        card,
        resumePlaybackOnClose:
          state.player.playing || willResumeOnClose(state.lookup),
      },
    };
    if (card.clip === null) return [opened, [{ type: "pausePlayer" }]];
    return loopPlayer(opened, card.clip);
  },
  flashcardFieldEdited: (state, { kind, value }) => [
    editCard(state, (card) => setFieldValue(card, kind, value)),
    [],
  ],
  flashcardFieldToggled: (state, { kind }) => [
    editCard(state, (card) => ({
      ...card,
      fields: toggleFlashcardField(card.fields, kind),
    })),
    [],
  ],
  flashcardTagsEdited: (state, { tags }) => [
    editCard(state, (card) => ({ ...card, tags: [...tags] })),
    [],
  ],
  flashcardEditorClosed: closeEditor,
  frameCaptureRequested: (state) => [state, [{ type: "captureFrame" }]],
  frameCaptured: (state, { dataUrl }) => [
    dataUrl === null
      ? state
      : editCard(state, (card) => setFieldValue(card, "screenshot", dataUrl)),
    [],
  ],
} satisfies Partial<UpdateHandlers>;

/** Closes the editor, stops its loop, and resumes playback if the editor interrupted it. */
function closeEditor(state: AppState): UpdateResult {
  const editor = state.flashcardEditor;
  if (editor.kind === "closed") return [state, []];
  const closed = { ...state, flashcardEditor: closedFlashcardEditor };
  const [unlooped, effects] = loopPlayer(closed, null);
  const resume = editor.resumePlaybackOnClose;
  return [unlooped, resume ? [...effects, { type: "playPlayer" }] : effects];
}

/** Applies the change to the card being edited. Leaves the state unchanged when the editor is closed. */
function editCard(
  state: AppState,
  change: (card: NewFlashcard) => NewFlashcard,
): AppState {
  const editor = state.flashcardEditor;
  if (editor.kind === "closed") return state;
  return {
    ...state,
    flashcardEditor: { ...editor, card: change(editor.card) },
  };
}

function setFieldValue(
  card: NewFlashcard,
  kind: FlashcardFieldKind,
  value: string,
): NewFlashcard {
  const fields = card.fields.map((field) =>
    field.kind === kind ? { ...field, value } : field,
  );
  return { ...card, fields };
}
