import { ChevronDown, Plus, X } from "lucide-react";
import { useReducer } from "react";
import { Button } from "../components/Button.tsx";
import { IconButton } from "../components/IconButton.tsx";
import { reduceEditor } from "./editFlashcard.ts";
import { EditorField, type MediaWaveform } from "./FlashcardEditorFields.tsx";
import {
  type FlashcardContent,
  type FlashcardFieldDefinition,
  type FlashcardFieldKey,
  type FlashcardLanguages,
  flashcardFields,
} from "./flashcardFields.ts";

/**
 * The form for a flashcard that was just created or reopened.
 * Fields outside the project's flashcard settings stay hidden until added back from the list at the bottom.
 */
export function FlashcardEditor({
  initialContent,
  initialFields,
  languages,
  waveform,
  onSave,
  onDelete,
  onClose,
}: {
  initialContent: FlashcardContent;
  initialFields: readonly FlashcardFieldKey[];
  languages: FlashcardLanguages;
  /** The audio of the media file, for editing the clip. Null for media without audio, such as an ebook. */
  waveform: MediaWaveform | null;
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
    showsHiddenFields: false,
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
            languages={languages}
            waveform={waveform}
            dispatch={dispatch}
          />
        ))}
        {hidden.length > 0 && (
          <div className="flex flex-col gap-1.5 border-t border-line pt-3">
            <Button
              size="sm"
              variant="subtle"
              className="self-start"
              aria-expanded={state.showsHiddenFields}
              onClick={() => dispatch({ type: "hiddenFieldsToggled" })}
            >
              <Plus className="size-3" aria-hidden />
              Add a field
              <ChevronDown
                className={
                  state.showsHiddenFields ? "size-3 rotate-180" : "size-3"
                }
                aria-hidden
              />
            </Button>
            {state.showsHiddenFields && (
              <div className="flex flex-wrap gap-1.5">
                {hidden.map((field) => (
                  <Button
                    key={field.key}
                    size="sm"
                    onClick={() =>
                      dispatch({ type: "fieldAdded", key: field.key })
                    }
                  >
                    {field.label(languages)}
                  </Button>
                ))}
              </div>
            )}
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
