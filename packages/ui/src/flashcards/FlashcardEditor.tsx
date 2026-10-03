import { Plus, Repeat, X } from "lucide-react";
import { useReducer } from "react";
import { Button } from "../components/Button.tsx";
import { CheckboxField } from "../components/CheckboxField.tsx";
import { IconButton } from "../components/IconButton.tsx";
import { TextField } from "../components/TextField.tsx";
import { formatTimestamp } from "../media/formatTimestamp.ts";
import {
  type FlashcardContent,
  type FlashcardFieldDefinition,
  type FlashcardFieldKey,
  type FlashcardTextFieldKey,
  flashcardFields,
  isTextField,
  toggleField,
} from "./flashcardFields.ts";
import { formatClipDuration } from "./formatClipDuration.ts";
import { parseTags } from "./parseTags.ts";

/** The flashcard being edited, plus the tags field's text, which keeps the comma the user is about to follow with another tag. */
type EditorState = {
  content: FlashcardContent;
  includedFields: readonly FlashcardFieldKey[];
  tagsText: string;
};

type EditorAction =
  | { type: "textChanged"; key: FlashcardTextFieldKey; value: string }
  | { type: "tagsChanged"; text: string }
  | { type: "fieldAdded"; key: FlashcardFieldKey }
  | { type: "screenshotToggled" };

/**
 * The form for a flashcard that was just created or reopened.
 * Fields outside the project's flashcard settings stay hidden until added back with the buttons at the bottom.
 */
export function FlashcardEditor({
  initialContent,
  initialFields,
  onSave,
  onDelete,
  onClose,
}: {
  initialContent: FlashcardContent;
  initialFields: readonly FlashcardFieldKey[];
  onSave: (
    content: FlashcardContent,
    fields: readonly FlashcardFieldKey[],
  ) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [state, dispatch] = useReducer(reduceEditor, {
    content: initialContent,
    includedFields: initialFields,
    tagsText: initialContent.tags.join(", "),
  });
  const { content, includedFields } = state;
  // The screenshot stays in view while the card has one, so that its checkbox can bring it back.
  const isShown = (field: FlashcardFieldDefinition) =>
    includedFields.includes(field.key) ||
    (field.key === "screenshot" && content.screenshot !== null);
  const shown = flashcardFields.filter(isShown);
  const hidden = flashcardFields.filter((field) => !isShown(field));
  return (
    <form
      aria-label="Flashcard"
      className="flex h-full w-full flex-col rounded-lg border border-line bg-surface text-fg"
      onSubmit={(event) => {
        event.preventDefault();
        onSave(content, includedFields);
      }}
    >
      <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-2">
        <h2 className="font-semibold">Flashcard</h2>
        {content.audioContext && (
          <span className="flex items-center gap-1 text-xs text-fg-muted">
            <Repeat className="size-3" aria-hidden />
            Looping {formatTimestamp(content.audioContext.startMs)} –{" "}
            {formatTimestamp(content.audioContext.endMs)}
          </span>
        )}
        <IconButton label="Close without saving" onClick={onClose}>
          <X className="size-4" />
        </IconButton>
      </div>
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-3">
        {shown.map((field) => (
          <EditorField
            key={field.key}
            field={field}
            state={state}
            dispatch={dispatch}
          />
        ))}
        {hidden.length > 0 && (
          <div className="flex flex-col gap-1.5 border-t border-line pt-3">
            <span className="text-xs font-medium text-fg-muted">
              Add a field
            </span>
            <div className="flex flex-wrap gap-1.5">
              {hidden.map((field) => (
                <Button
                  key={field.key}
                  size="sm"
                  onClick={() =>
                    dispatch({ type: "fieldAdded", key: field.key })
                  }
                >
                  <Plus className="size-3" aria-hidden />
                  {field.label}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="flex justify-between gap-2 border-t border-line px-4 py-2">
        <Button variant="danger" onClick={onDelete}>
          Delete
        </Button>
        <Button variant="primary" type="submit">
          Save
        </Button>
      </div>
    </form>
  );
}

function EditorField({
  field,
  state,
  dispatch,
}: {
  field: FlashcardFieldDefinition;
  state: EditorState;
  dispatch: (action: EditorAction) => void;
}) {
  const { content } = state;
  const { key, label } = field;
  if (isTextField(key)) {
    return (
      <TextField
        label={label}
        multiline={field.multiline}
        value={content[key]}
        onChange={(event) =>
          dispatch({ type: "textChanged", key, value: event.target.value })
        }
      />
    );
  }
  if (key === "tags") {
    return (
      <TextField
        label={label}
        hint="Separate tags with commas."
        value={state.tagsText}
        onChange={(event) =>
          dispatch({ type: "tagsChanged", text: event.target.value })
        }
      />
    );
  }
  if (key === "audioContext") {
    return (
      <div className="flex flex-col gap-1 text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-fg-muted">
          {content.audioContext
            ? `Clip of ${formatClipDuration(content.audioContext)} from the media`
            : "No audio for this sentence"}
        </span>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2 text-sm">
      <span className="font-medium">{label}</span>
      {content.screenshot ? (
        <>
          <img
            src={content.screenshot}
            alt="Screenshot from the video"
            className="max-h-32 self-start rounded-md"
          />
          <CheckboxField
            label="Include the screenshot"
            checked={state.includedFields.includes("screenshot")}
            onChange={() => dispatch({ type: "screenshotToggled" })}
          />
        </>
      ) : (
        <span className="text-fg-muted">No video frame for this sentence</span>
      )}
    </div>
  );
}

function reduceEditor(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case "textChanged":
      return {
        ...state,
        content: { ...state.content, [action.key]: action.value },
      };
    case "tagsChanged":
      return {
        ...state,
        tagsText: action.text,
        content: { ...state.content, tags: parseTags(action.text) },
      };
    case "fieldAdded":
      return {
        ...state,
        includedFields: [...state.includedFields, action.key],
      };
    case "screenshotToggled":
      return {
        ...state,
        includedFields: toggleField(state.includedFields, "screenshot"),
      };
  }
}
