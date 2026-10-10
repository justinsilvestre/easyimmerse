import type {
  Flashcard,
  FlashcardDraft,
  FlashcardFieldKey,
  NewFlashcard,
} from "@easyimmerse/types";
import {
  type EditorAction,
  type EditorState,
  reduceEditor,
} from "./editFlashcard.ts";
import { screenshotForClip } from "./flashcardDrafts.ts";
import type { LookupFlashcardFields } from "./lookupFields.ts";

/** A flashcard as the form holds it: a new one, or one the project has, with the user's edits. */
export type FlashcardCard =
  | {
      kind: "new";
      /** The id the flashcard is created under, made where the opening action was dispatched; sending it again replaces it rather than duplicating it. */
      flashcardId: string;
      /** The draft the card started from, which holds its media file, cue and word position. */
      draft: FlashcardDraft;
      editor: EditorState;
      /** The text fields the user has typed in, which a late lookup leaves alone. */
      typedFields: readonly FlashcardFieldKey[];
      /** Whether the user has changed the card since it opened. */
      isChanged: boolean;
    }
  | {
      kind: "existing";
      /** The flashcard as the form opened it, already overlaid with its latest pending or confirmed content. */
      flashcard: Flashcard;
      editor: EditorState;
      isChanged: boolean;
    };

/** A card that the project does not have yet. */
export type NewCard = Extract<FlashcardCard, { kind: "new" }>;

/** The waveform segment id of a new flashcard, which has no id of its own until it is saved. */
export const newFlashcardSegmentId = "new";

/** A new card as the dispatcher made it, unchanged. */
export function newCard({ id, draft }: NewFlashcard): NewCard {
  return {
    kind: "new",
    flashcardId: id,
    draft,
    editor: editorStateOf(draft),
    typedFields: [],
    isChanged: false,
  };
}

/** A card of a flashcard the project has, unchanged. */
export function existingCard(flashcard: Flashcard): FlashcardCard {
  return {
    kind: "existing",
    flashcard,
    editor: editorStateOf(flashcard),
    isChanged: false,
  };
}

/** Applies the user's change to a card, marking it changed and noting a text field typed in. */
export function editCard<C extends FlashcardCard>(
  card: C,
  action: EditorAction,
): C {
  const editor = reduceEditor(card.editor, action);
  if (editor === card.editor) return card;
  if (card.kind !== "new" || action.type !== "textChanged")
    return { ...card, editor, isChanged: true };
  const typedFields = [...new Set([...card.typedFields, action.key])];
  return { ...card, editor, isChanged: true, typedFields };
}

/** Fills the fields of a new card from its lookup, except those the user has typed in. */
export function withLookupFields(
  card: NewCard,
  fields: LookupFlashcardFields | null,
): NewCard {
  if (fields === null) return card;
  const untyped = Object.entries(fields).filter(
    ([key]) => !card.typedFields.includes(key as FlashcardFieldKey),
  );
  const content = { ...card.editor.content, ...Object.fromEntries(untyped) };
  return { ...card, editor: { ...card.editor, content } };
}

/** Gives a new card with a clip and no screenshot the frame in the middle of its clip. */
export function withScreenshot(card: NewCard): NewCard {
  const { content } = card.editor;
  if (content.screenshot !== null || content.audio_context === null)
    return card;
  const screenshot = screenshotForClip(content.audio_context);
  return {
    ...card,
    editor: { ...card.editor, content: { ...content, screenshot } },
  };
}

/** The id a card's flashcard has, or will be created under. */
export function flashcardIdOf(card: FlashcardCard): string {
  return card.kind === "existing" ? card.flashcard.id : card.flashcardId;
}

/** The media file whose form edits the card, or null when the card has none. */
export function mediaFileIdOf(card: FlashcardCard): string | null {
  return card.kind === "new"
    ? card.draft.media_file_id
    : card.flashcard.media_file_id;
}

/** The id of the card's segment on the waveform. */
export function segmentIdOf(card: FlashcardCard): string {
  return card.kind === "new" ? newFlashcardSegmentId : card.flashcard.id;
}

function editorStateOf(card: FlashcardDraft | Flashcard): EditorState {
  return { content: card.content, includedFields: card.included_fields };
}
