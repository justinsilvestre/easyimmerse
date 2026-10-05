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

/** The flashcard open in the editor, one not saved yet or one the project holds, with the editor's unsaved changes to it. */
export type EditedFlashcard =
  | {
      kind: "new";
      draft: FlashcardDraft;
      editor: EditorState;
      /** The text fields the user has typed in, which a late lookup leaves alone. */
      typedFields: readonly FlashcardFieldKey[];
    }
  | { kind: "existing"; flashcard: Flashcard; editor: EditorState };

export type EditedFlashcardAction =
  | { type: "started"; draft: FlashcardDraft }
  | { type: "opened"; flashcard: Flashcard }
  | { type: "edited"; action: EditorAction }
  /** The lookup of the new flashcard started from `draft` has answered after the editor opened. */
  | {
      type: "lookupAnswered";
      draft: FlashcardDraft;
      fields: LookupFlashcardFields;
    }
  /** The media file has turned out to show pictures, so a new flashcard started before then can have a screenshot. */
  | { type: "screenshotsAvailable" }
  | { type: "closed" };

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
      };
    case "opened":
      return {
        kind: "existing",
        flashcard: action.flashcard,
        editor: editorStateOf(action.flashcard),
      };
    case "edited":
      return edited && withEdit(edited, action.action);
    case "lookupAnswered":
      return edited?.kind === "new" && edited.draft === action.draft
        ? withLookupFields(edited, action.fields)
        : edited;
    case "screenshotsAvailable":
      return edited?.kind === "new" ? withScreenshot(edited) : edited;
    case "closed":
      return null;
  }
}

function withEdit(
  edited: EditedFlashcard,
  action: EditorAction,
): EditedFlashcard {
  const editor = reduceEditor(edited.editor, action);
  if (edited.kind !== "new" || action.type !== "textChanged")
    return { ...edited, editor };
  return {
    ...edited,
    editor,
    typedFields: [...new Set([...edited.typedFields, action.key])],
  };
}

/** Fills the fields of a new flashcard from its lookup, except those the user has typed in. */
function withLookupFields(
  edited: Extract<EditedFlashcard, { kind: "new" }>,
  fields: LookupFlashcardFields,
): EditedFlashcard {
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

function withScreenshot(
  edited: Extract<EditedFlashcard, { kind: "new" }>,
): EditedFlashcard {
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
