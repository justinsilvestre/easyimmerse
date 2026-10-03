import { Plus, X } from "lucide-react";
import { useReducer } from "react";
import { Button } from "../components/Button.tsx";
import { IconButton } from "../components/IconButton.tsx";
import { MenuButton } from "../components/MenuButton.tsx";
import { TagsField } from "../components/TagsField.tsx";
import { reduceEditor } from "./editFlashcard.ts";
import {
  MediaFields,
  type MediaWaveform,
  TextFieldBlocks,
} from "./FlashcardEditorFields.tsx";
import {
  type FlashcardContent,
  type FlashcardFieldDefinition,
  type FlashcardFieldKey,
  type FlashcardLanguages,
  flashcardFields,
} from "./flashcardFields.ts";

/**
 * The form for a flashcard that was just created or reopened.
 * Fields outside the project's flashcard settings stay hidden until added back from the menu at the bottom.
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
  });
  const { content, includedFields } = state;
  // The screenshot stays in view while the card has one, so that its checkbox can bring it back.
  const isShown = (field: FlashcardFieldDefinition) =>
    includedFields.includes(field.key) ||
    (field.key === "screenshot" && content.screenshot !== null);
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
        <TextFieldBlocks
          state={state}
          languages={languages}
          dispatch={dispatch}
        />
        <MediaFields state={state} waveform={waveform} dispatch={dispatch} />
        {includedFields.includes("tags") && (
          <TagsField
            label="Tags"
            isLabelBeside
            tags={content.tags}
            onChange={(tags) => dispatch({ type: "tagsChanged", tags })}
          />
        )}
        {hidden.length > 0 && (
          <div className="border-t border-line pt-3">
            <MenuButton
              label="Add a field"
              opensUpward
              items={hidden.map((field) => ({
                label: field.label(languages),
                onSelect: () =>
                  dispatch({ type: "fieldAdded", key: field.key }),
              }))}
            >
              <Plus className="size-3" aria-hidden />
              Add a field
            </MenuButton>
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
