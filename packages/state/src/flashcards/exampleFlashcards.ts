import type {
  AudioClip,
  Flashcard,
  FlashcardContent,
  FlashcardDraft,
  NewFlashcard,
} from "@easyimmerse/types";
import { flashcardActions } from "./flashcardActions.ts";
import type { LookupFieldsContext } from "./flashcardForm.ts";

/** The languages of the example project, with no dictionaries. */
export const exampleContext: LookupFieldsContext = {
  languages: { target: "de", translation: "en" },
  dictionaries: [],
};

/** The content of an example flashcard for a word, with a clip and no screenshot. */
export function exampleContent(word: string): FlashcardContent {
  return {
    word,
    word_pronunciation: "",
    l1_definition: "",
    l2_definition: "",
    text_context: `Die ${word} schläft.`,
    text_context_translation: "",
    text_context_pronunciation: "",
    audio_context: { start_ms: 1000, end_ms: 2000 },
    screenshot: null,
    tags: [],
  };
}

/** The draft of an example flashcard for a word, made from cue 1 of m1. */
export function exampleDraft(word: string): FlashcardDraft {
  return {
    media_file_id: "m1",
    cue_index: 1,
    word_start: 4,
    content: exampleContent(word),
    included_fields: ["word"],
  };
}

/** A new example flashcard for a word, as a dispatcher makes it, under the given id. */
export function exampleNewFlashcard(id: string, word = id): NewFlashcard {
  return { id, draft: exampleDraft(word) };
}

/** An example flashcard of p1 for a word, as the server lists it, last updated at `updatedAtMs`. */
export function exampleListedFlashcard(
  id: string,
  word: string,
  updatedAtMs = 1,
): Flashcard {
  return {
    ...exampleDraft(word),
    id,
    project_id: "p1",
    created_at_ms: 1,
    updated_at_ms: updatedAtMs,
  };
}

/** Opens a new example flashcard in the form, with the given clip. */
export function openWithClip(clip: AudioClip) {
  const draft = exampleDraft("Katze");
  const content = { ...draft.content, audio_context: clip };
  return flashcardActions.flashcardStarted(
    { id: "f-clip", draft: { ...draft, content } },
    "editor",
  );
}
