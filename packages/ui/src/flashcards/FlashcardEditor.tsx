import { X } from "lucide-react";
import { Button } from "../components/Button.tsx";
import { IconButton } from "../components/IconButton.tsx";
import { MenuButton } from "../components/MenuButton.tsx";
import { TagsField } from "../components/TagsField.tsx";
import type { EditorAction, EditorState } from "./editFlashcard.ts";
import {
  MediaFields,
  type MediaWaveform,
  TextFieldBlocks,
} from "./FlashcardEditorFields.tsx";
import {
  type FlashcardLanguages,
  flashcardFieldDefinitions,
} from "./flashcardFields.ts";

/**
 * The form for a flashcard that was just created or reopened.
 * Fields outside the project's flashcard settings stay hidden until checked in the "More fields" menu; the screenshot has its own checkbox.
 * The caller holds the flashcard being edited, so that other views can show and change it too.
 */
export function FlashcardEditor({
  state,
  dispatch,
  languages,
  waveform,
  screenshotUrl = null,
  onSave,
  onDelete,
  onClose,
}: {
  state: EditorState;
  dispatch: (action: EditorAction) => void;
  languages: FlashcardLanguages;
  /** The audio of the media file, for editing the clip. Null for media without audio, such as an ebook. */
  waveform: MediaWaveform | null;
  /** The image of the screenshot at its current time. Without it, no screenshot is shown. */
  screenshotUrl?: string | null;
  onSave: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const { content, includedFields } = state;
  return (
    <form
      aria-label="Flashcard"
      className="flex h-full w-full flex-col rounded-lg border border-line bg-surface text-fg"
      onSubmit={(event) => {
        event.preventDefault();
        onSave();
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
        <MediaFields
          state={state}
          waveform={waveform}
          screenshotUrl={screenshotUrl}
          dispatch={dispatch}
        />
        {includedFields.includes("tags") && (
          <TagsField
            label="Tags"
            isLabelBeside
            className="shrink-0"
            tags={content.tags}
            onChange={(tags) => dispatch({ type: "tagsChanged", tags })}
          />
        )}
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-line px-4 py-2">
        <MenuButton
          label="More fields"
          opensUpward
          items={flashcardFieldDefinitions
            .filter((field) => field.key !== "screenshot")
            .map((field) => ({
              label: field.label(languages),
              isChecked: includedFields.includes(field.key),
              onSelect: () =>
                dispatch({ type: "fieldToggled", key: field.key }),
            }))}
        >
          More fields
        </MenuButton>
        <div className="flex gap-2">
          <Button variant="danger" onClick={onDelete}>
            Delete
          </Button>
          <Button variant="primary" type="submit">
            Save
          </Button>
        </div>
      </div>
    </form>
  );
}
