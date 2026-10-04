import {
  type AudioClip,
  type FlashcardContent,
  type FlashcardFieldKey,
  type FlashcardTextFieldKey,
  type Screenshot,
  toggleField,
} from "./flashcardFields.ts";

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
  /** A new image arrived for the screenshot, taken at the time it names. It is kept unless the screenshot has since moved to another time. */
  | { type: "screenshotCaptured"; screenshot: Screenshot }
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
            screenshot: { ...state.content.screenshot, at_ms: action.ms },
          });
    case "screenshotCaptured":
      return isScreenshotAwaited(state, action.screenshot.at_ms)
        ? withContent(state, { screenshot: action.screenshot })
        : state;
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

/** Whether a screenshot taken at the time belongs on the flashcard: there is none yet, or the current one was taken at that time. */
function isScreenshotAwaited(state: EditorState, atMs: number): boolean {
  const current = state.content.screenshot;
  return current === null || current.at_ms === atMs;
}
