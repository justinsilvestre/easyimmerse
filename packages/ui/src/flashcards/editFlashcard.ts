import type {
  AudioClip,
  FlashcardContent,
  FlashcardFieldKey,
} from "@easyimmerse/types";
import { type FlashcardTextFieldKey, toggleField } from "./flashcardFields.ts";

/** The flashcard being edited. */
export type EditorState = {
  content: FlashcardContent;
  includedFields: readonly FlashcardFieldKey[];
};

export type EditorAction =
  | { type: "textChanged"; key: FlashcardTextFieldKey; value: string }
  | { type: "tagsChanged"; tags: readonly string[] }
  | { type: "clipChanged"; clip: AudioClip }
  | { type: "screenshotMsChanged"; ms: number }
  | { type: "fieldToggled"; key: FlashcardFieldKey }
  | { type: "screenshotToggled" };

export function reduceEditor(
  state: EditorState,
  action: EditorAction,
): EditorState {
  switch (action.type) {
    case "textChanged":
      return withContent(state, { [action.key]: action.value });
    case "tagsChanged":
      return withContent(state, { tags: [...action.tags] });
    case "clipChanged":
      return withContent(state, { audio_context: action.clip });
    case "screenshotMsChanged":
      return state.content.screenshot === null
        ? state
        : withContent(state, {
            screenshot: { at_ms: action.ms },
          });
    case "fieldToggled":
      return {
        ...state,
        includedFields: toggleField(state.includedFields, action.key),
      };
    case "screenshotToggled":
      return {
        ...state,
        includedFields: toggleField(state.includedFields, "screenshot"),
      };
  }
}

function withContent(
  state: EditorState,
  changes: Partial<FlashcardContent>,
): EditorState {
  return { ...state, content: { ...state.content, ...changes } };
}
