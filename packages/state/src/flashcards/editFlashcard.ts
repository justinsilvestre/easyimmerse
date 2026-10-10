import type {
  AudioClip,
  FlashcardContent,
  FlashcardFieldKey,
} from "@easyimmerse/types";

/** The keys of a flashcard's fields that hold text the user can type. */
export type FlashcardTextFieldKey = {
  [Key in FlashcardFieldKey]: FlashcardContent[Key] extends string
    ? Key
    : never;
}[FlashcardFieldKey];

/** The flashcard as the form shows it: its content and the fields it includes. */
export type EditorState = {
  content: FlashcardContent;
  includedFields: readonly FlashcardFieldKey[];
};

/** A change the user makes to the open flashcard, in the form or with the waveform's handles. */
export type EditorAction =
  | { type: "textChanged"; key: FlashcardTextFieldKey; value: string }
  | { type: "tagsChanged"; tags: readonly string[] }
  | { type: "clipChanged"; clip: AudioClip }
  | { type: "screenshotMsChanged"; ms: number }
  | { type: "fieldToggled"; key: FlashcardFieldKey }
  | { type: "screenshotToggled" };

/** Applies a change to the flashcard the form shows. */
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
        : withContent(state, { screenshot: { at_ms: action.ms } });
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

/** Adds the field to the selection, or removes it when it is already there. */
export function toggleField(
  fields: readonly FlashcardFieldKey[],
  key: FlashcardFieldKey,
): FlashcardFieldKey[] {
  if (!fields.includes(key)) return [...fields, key];
  return fields.filter((field) => field !== key);
}

/** Moves one end of a clip to a time, rounded to a millisecond, without passing the other end. */
export function moveClipEndpoint(
  clip: AudioClip,
  endpoint: "start" | "end",
  ms: number,
): AudioClip {
  return endpoint === "start"
    ? { ...clip, start_ms: Math.round(Math.min(ms, clip.end_ms)) }
    : { ...clip, end_ms: Math.round(Math.max(ms, clip.start_ms)) };
}
