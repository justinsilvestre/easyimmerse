import type {
  Flashcard,
  FlashcardDraft,
  FlashcardFieldKey,
} from "@easyimmerse/types";
import type { LookupFlashcardFields } from "../lookup/flashcardFieldsFromLookup.ts";
import { screenshotForClip } from "./draftFromCue.ts";
import {
  type EditorAction,
  type EditorState,
  reduceEditor,
} from "./editFlashcard.ts";

/** The waveform segment id of a new flashcard, which has no id of its own until it is saved. */
export const newFlashcardSegmentId = "new";

/**
 * Where the open card stands on its way to being saved:
 * - `editing`: open for changes;
 * - `awaitingLookup`: a new card whose word's lookup has yet to answer, after the editor opened without it;
 * - `awaitingLookupToSave`: the same, with a save the user asked for waiting until the lookup answers, fails or takes too long;
 * - `readyToSend`: a save the user asked for, to be sent;
 * - `sending`: a save on its way, during which Save does nothing.
 */
export type SaveStage =
  | "editing"
  | "awaitingLookup"
  | "awaitingLookupToSave"
  | "readyToSend"
  | "sending";

/** The flashcard open in the editor, one not saved yet or one the project holds, with the editor's unsaved changes to it. */
export type EditedFlashcard =
  | {
      kind: "new";
      draft: FlashcardDraft;
      editor: EditorState;
      /** The text fields the user has typed in, which a late lookup leaves alone. */
      typedFields: readonly FlashcardFieldKey[];
      stage: SaveStage;
    }
  | {
      kind: "existing";
      flashcard: Flashcard;
      editor: EditorState;
      stage: SaveStage;
    };

export type EditedFlashcardAction =
  /** A new flashcard opens, perhaps before the lookup of its word has answered. */
  | { type: "started"; draft: FlashcardDraft; awaitsLookup?: boolean }
  | { type: "opened"; flashcard: Flashcard }
  | { type: "edited"; action: EditorAction }
  /** The lookup of the new flashcard started from `draft` has answered after the editor opened. */
  | {
      type: "lookupAnswered";
      draft: FlashcardDraft;
      fields: LookupFlashcardFields;
    }
  /** The lookup of the new flashcard started from `draft` has failed, or a save has stopped waiting for it. */
  | { type: "lookupFailed"; draft: FlashcardDraft }
  | { type: "saveRequested" }
  | { type: "sendStarted" }
  /** The card that `source`, its draft or saved flashcard, opened has been saved. */
  | { type: "saved"; source: FlashcardSource }
  | { type: "saveFailed"; source: FlashcardSource }
  /** The media file has turned out to show pictures, so a new flashcard started before then can have a screenshot. */
  | { type: "screenshotsAvailable" }
  | { type: "closed" };

/** What an open card was opened from, which tells it apart from any card opened later. */
export type FlashcardSource = FlashcardDraft | Flashcard;

export function reduceEditedFlashcard(
  edited: EditedFlashcard | null,
  action: EditedFlashcardAction,
): EditedFlashcard | null {
  switch (action.type) {
    case "started":
      return {
        kind: "new",
        draft: action.draft,
        editor: editorStateOf(action.draft),
        typedFields: [],
        stage: action.awaitsLookup ? "awaitingLookup" : "editing",
      };
    case "opened":
      return {
        kind: "existing",
        flashcard: action.flashcard,
        editor: editorStateOf(action.flashcard),
        stage: "editing",
      };
    case "edited":
      // The editor is read-only from then on, so that nothing typed is lost to the save under way.
      return edited && !isSending(edited.stage)
        ? withEdit(edited, action.action)
        : edited;
    case "lookupAnswered":
      return isAwaitingLookupOf(edited, action.draft)
        ? settleLookup(withLookupFields(edited, action.fields))
        : edited;
    case "lookupFailed":
      return isAwaitingLookupOf(edited, action.draft)
        ? settleLookup(edited)
        : edited;
    case "saveRequested":
      return edited && withStage(edited, stageAfterSaveRequest(edited.stage));
    case "sendStarted":
      return edited?.stage === "readyToSend"
        ? withStage(edited, "sending")
        : edited;
    case "saved":
      return edited && sourceOf(edited) === action.source ? null : edited;
    case "saveFailed":
      return edited && sourceOf(edited) === action.source
        ? withStage(edited, "editing")
        : edited;
    case "screenshotsAvailable":
      return edited?.kind === "new" ? withScreenshot(edited) : edited;
    case "closed":
      return null;
  }
}

export function sourceOf(edited: EditedFlashcard): FlashcardSource {
  return edited.kind === "new" ? edited.draft : edited.flashcard;
}

/** Tells the editor whether its save waits for definitions, is under way, or is free to ask for. */
export function saveStatusOf(
  edited: EditedFlashcard,
): "idle" | "waitingForDefinitions" | "saving" {
  switch (edited.stage) {
    case "editing":
    case "awaitingLookup":
      return "idle";
    case "awaitingLookupToSave":
      return "waitingForDefinitions";
    case "readyToSend":
    case "sending":
      return "saving";
  }
}

function isSending(stage: SaveStage): boolean {
  return stage === "readyToSend" || stage === "sending";
}

function stageAfterSaveRequest(stage: SaveStage): SaveStage {
  if (stage === "editing") return "readyToSend";
  if (stage === "awaitingLookup") return "awaitingLookupToSave";
  return stage;
}

type NewFlashcard = Extract<EditedFlashcard, { kind: "new" }>;

function isAwaitingLookupOf(
  edited: EditedFlashcard | null,
  draft: FlashcardDraft,
): edited is NewFlashcard {
  return (
    edited?.kind === "new" &&
    edited.draft === draft &&
    (edited.stage === "awaitingLookup" ||
      edited.stage === "awaitingLookupToSave")
  );
}

/** Ends the wait for a lookup, sending a save that waited for it. */
function settleLookup(edited: NewFlashcard): EditedFlashcard {
  return withStage(
    edited,
    edited.stage === "awaitingLookupToSave" ? "readyToSend" : "editing",
  );
}

function withStage(edited: EditedFlashcard, stage: SaveStage): EditedFlashcard {
  return edited.stage === stage ? edited : { ...edited, stage };
}

function withEdit(
  edited: EditedFlashcard,
  action: EditorAction,
): EditedFlashcard {
  const editor = reduceEditor(edited.editor, action);
  if (edited.kind !== "new" || action.type !== "textChanged")
    return { ...edited, editor };
  const typed = {
    ...edited,
    editor,
    typedFields: [...new Set([...edited.typedFields, action.key])],
  };
  // A changed word makes the definitions on their way those of another word, so they are given up.
  return action.key === "word" && isAwaitingLookupOf(edited, edited.draft)
    ? settleLookup(typed)
    : typed;
}

/** Fills the fields of a new flashcard from its lookup, except those the user has typed in. */
function withLookupFields(
  edited: NewFlashcard,
  fields: LookupFlashcardFields,
): NewFlashcard {
  const untyped = Object.entries(fields).filter(
    ([key]) => !edited.typedFields.includes(key as FlashcardFieldKey),
  );
  const { content } = edited.editor;
  return {
    ...edited,
    editor: {
      ...edited.editor,
      content: { ...content, ...Object.fromEntries(untyped) },
    },
  };
}

function withScreenshot(edited: NewFlashcard): EditedFlashcard {
  const { content } = edited.editor;
  if (content.screenshot !== null || content.audio_context === null)
    return edited;
  const screenshot = screenshotForClip(content.audio_context);
  return {
    ...edited,
    editor: { ...edited.editor, content: { ...content, screenshot } },
  };
}

export function segmentIdOf(edited: EditedFlashcard): string {
  return edited.kind === "new" ? newFlashcardSegmentId : edited.flashcard.id;
}

/**
 * The flashcards to draw on the waveform: the saved ones, with the open card's unsaved content in place of its saved content,
 * and then the open card when it is new.
 */
export function flashcardsOnWaveform(
  flashcards: readonly Flashcard[],
  edited: EditedFlashcard | null,
): Pick<Flashcard, "id" | "content">[] {
  const editedId = edited && segmentIdOf(edited);
  const saved = flashcards.map(({ id, content }) => ({
    id,
    content: id === editedId && edited ? edited.editor.content : content,
  }));
  return edited?.kind === "new"
    ? [...saved, { id: newFlashcardSegmentId, content: edited.editor.content }]
    : saved;
}

function editorStateOf(card: FlashcardDraft | Flashcard): EditorState {
  return { content: card.content, includedFields: card.included_fields };
}
