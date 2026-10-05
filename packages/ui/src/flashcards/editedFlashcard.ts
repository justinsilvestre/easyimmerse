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
import {
  isAwaitingLookup,
  isLocked,
  isSending,
  type SaveStage,
  stageAfterLookup,
  stageAfterSaveRequest,
} from "./saveStage.ts";

/** The waveform segment id of a new flashcard, which has no id of its own until it is saved. */
export const newFlashcardSegmentId = "new";

/** The flashcard open in the editor, one not saved yet or one the project holds, with the editor's unsaved changes to it. */
export type EditedFlashcard =
  | {
      kind: "new";
      /** The id the flashcard is created under, so that sending it again replaces it rather than creating another. */
      flashcardId: string;
      draft: FlashcardDraft;
      editor: EditorState;
      /** The text fields the user has typed in, which a late lookup leaves alone. */
      typedFields: readonly FlashcardFieldKey[];
      stage: SaveStage;
      /** Whether the user has changed the card since it opened, which a lookup filling it does not count as. */
      isChanged: boolean;
      session: CardSession;
    }
  | {
      kind: "existing";
      flashcard: Flashcard;
      editor: EditorState;
      stage: SaveStage;
      isChanged: boolean;
      session: CardSession;
    };

export type EditedFlashcardAction =
  /** A new flashcard opens, perhaps before the lookup of its word has answered. */
  | {
      type: "started";
      draft: FlashcardDraft;
      flashcardId: string;
      awaitsLookup?: boolean;
      session: CardSession;
    }
  | { type: "opened"; flashcard: Flashcard; session: CardSession }
  /** A card that left the editor comes back to it with its edits, as when a discard is undone or a failed save reopened. */
  | { type: "restored"; card: EditedFlashcard; session: CardSession }
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
  /** The card opened in `session` has been saved. */
  | { type: "saved"; session: CardSession }
  | { type: "saveFailed"; session: CardSession }
  /** The media file has turned out to show pictures, so a new flashcard started before then can have a screenshot. */
  | { type: "screenshotsAvailable" }
  | { type: "closed" };

/**
 * Tells one opening of a card in the editor from every other, even of the same saved flashcard,
 * so that a save's outcome reaches only the opening it was sent from.
 */
export type CardSession = symbol;

/** Creates the id a new flashcard is saved under, in the form of the ids the backend makes: 32 lowercase hexadecimal digits. */
export function createFlashcardId(): string {
  // crypto.getRandomValues works outside secure contexts too, unlike crypto.randomUUID.
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

/** Creates the session of a new opening, to be carried by the action that opens the card. */
export function createCardSession(): CardSession {
  return Symbol("flashcard opening");
}

export function reduceEditedFlashcard(
  edited: EditedFlashcard | null,
  action: EditedFlashcardAction,
): EditedFlashcard | null {
  switch (action.type) {
    case "started":
      return {
        kind: "new",
        flashcardId: action.flashcardId,
        draft: action.draft,
        editor: editorStateOf(action.draft),
        typedFields: [],
        stage: action.awaitsLookup ? "awaitingLookup" : "editing",
        isChanged: false,
        session: action.session,
      };
    case "opened":
      return {
        kind: "existing",
        flashcard: action.flashcard,
        editor: editorStateOf(action.flashcard),
        stage: "editing",
        isChanged: false,
        session: action.session,
      };
    case "restored":
      // A restored card holds edits that are saved nowhere, which closing it would lose.
      return {
        ...action.card,
        stage: "editing",
        isChanged: true,
        session: action.session,
      };
    case "edited":
      // The editor is read-only once Save is pressed, so that what is saved is what the user saw.
      return edited && !isLocked(edited.stage)
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
      return edited?.session === action.session ? null : edited;
    case "saveFailed":
      return edited?.session === action.session
        ? withStage(edited, "editing")
        : edited;
    case "screenshotsAvailable":
      // A save under way would not hold a screenshot added now.
      return edited?.kind === "new" && !isSending(edited.stage)
        ? withScreenshot(edited)
        : edited;
    case "closed":
      return null;
  }
}

type NewFlashcard = Extract<EditedFlashcard, { kind: "new" }>;

function isAwaitingLookupOf(
  edited: EditedFlashcard | null,
  draft: FlashcardDraft,
): edited is NewFlashcard {
  return (
    edited?.kind === "new" &&
    edited.draft === draft &&
    isAwaitingLookup(edited.stage)
  );
}

function settleLookup(edited: NewFlashcard): EditedFlashcard {
  return withStage(edited, stageAfterLookup(edited.stage));
}

function withStage(edited: EditedFlashcard, stage: SaveStage): EditedFlashcard {
  return edited.stage === stage ? edited : { ...edited, stage };
}

function withEdit(
  edited: EditedFlashcard,
  action: EditorAction,
): EditedFlashcard {
  const editor = reduceEditor(edited.editor, action);
  if (editor === edited.editor) return edited;
  if (edited.kind !== "new" || action.type !== "textChanged")
    return { ...edited, editor, isChanged: true };
  const typed = {
    ...edited,
    editor,
    isChanged: true,
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

/** The id a card's flashcard has, or will be created under. */
export function flashcardIdOf(card: EditedFlashcard): string {
  return card.kind === "existing" ? card.flashcard.id : card.flashcardId;
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
