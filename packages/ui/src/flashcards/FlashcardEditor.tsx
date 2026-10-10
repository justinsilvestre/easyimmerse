import type { EditorAction, EditorState } from "@easyimmerse/state";
import type { AudioClip } from "@easyimmerse/types";
import clsx from "clsx";
import { X } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "../components/Button.tsx";
import { IconButton } from "../components/IconButton.tsx";
import { MenuButton } from "../components/MenuButton.tsx";
import { ModalDialog } from "../components/ModalDialog.tsx";
import { TagsField } from "../components/TagsField.tsx";
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
 * Delete asks first, in a dialog naming the word; a new card that was never saved has no Delete, since Close without saving offers Undo.
 */
export function FlashcardEditor({
  state,
  dispatch,
  languages,
  waveform,
  screenshotUrl = null,
  mediaDurationMs = 0,
  saveStatus = "idle",
  isNew = false,
  hasSaveFailed = false,
  isAwaitingLookup = false,
  onSave,
  onDelete,
  onClose,
  onPlayClip,
}: {
  state: EditorState;
  dispatch: (action: EditorAction) => void;
  languages: FlashcardLanguages;
  /** The audio of the media file, for editing the clip. Null for media without audio, such as an ebook. */
  waveform: MediaWaveform | null;
  /** The image of the screenshot at its current time. Without it, no screenshot is shown. */
  screenshotUrl?: string | null;
  /** The media file's length, which the clip's end stays within; zero, the default, while it is unknown. */
  mediaDurationMs?: number;
  /**
   * Whether a save the user asked for waits for definitions still on their way, or is under way.
   * Meanwhile Save, Close and Delete do nothing and the fields are read-only, so that what is saved is what is shown.
   */
  saveStatus?: "idle" | "waitingForDefinitions" | "saving";
  /** Whether the flashcard has never been saved, so that there is nothing to delete. */
  isNew?: boolean;
  /** Whether the last save failed, which the status line tells until Save is pressed again. */
  hasSaveFailed?: boolean;
  /** Whether the word's lookup has yet to answer, which the fields it fills say while they are empty. */
  isAwaitingLookup?: boolean;
  onSave: () => void;
  onDelete: () => void;
  onClose: () => void;
  /** Plays the clip on the media player. */
  onPlayClip: (clip: AudioClip) => void;
}) {
  const { content, includedFields } = state;
  const saveStatusId = useId();
  const isSaveInert = saveStatus !== "idle";
  const [isConfirmingDelete, setConfirmingDelete] = useState(false);
  const showsFailure = hasSaveFailed && saveStatus === "idle";
  return (
    <>
      <form
        aria-label="Flashcard"
        className="flex h-full w-full flex-col rounded-lg border border-line bg-surface text-fg"
        onSubmit={(event) => {
          event.preventDefault();
          if (!isSaveInert) onSave();
        }}
      >
        <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-2">
          <h2 className="font-semibold">Flashcard</h2>
          <IconButton
            label="Close without saving"
            aria-disabled={isSaveInert || undefined}
            onClick={() => {
              if (!isSaveInert) onClose();
            }}
          >
            <X className="size-4" />
          </IconButton>
        </div>
        <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-3">
          <TextFieldBlocks
            state={state}
            languages={languages}
            dispatch={dispatch}
            isReadOnly={isSaveInert}
            isAwaitingLookup={isAwaitingLookup}
          />
          <MediaFields
            state={state}
            waveform={waveform}
            screenshotUrl={screenshotUrl}
            mediaDurationMs={mediaDurationMs}
            dispatch={dispatch}
            onPlayClip={onPlayClip}
            isReadOnly={isSaveInert}
          />
          {includedFields.includes("tags") && (
            <TagsField
              label="Tags"
              isLabelBeside
              isReadOnly={isSaveInert}
              className="shrink-0"
              tags={content.tags}
              onChange={(tags) => dispatch({ type: "tagsChanged", tags })}
            />
          )}
        </div>
        <div className="flex flex-col border-t border-line px-4 py-2">
          {/* Always shown, even while empty, so that its text is announced when it appears. */}
          <p
            id={saveStatusId}
            role="status"
            className={clsx(
              "text-xs",
              showsFailure ? "text-danger-fg" : "text-fg-muted",
            )}
          >
            {showsFailure ? saveFailedText : saveStatusTexts[saveStatus]}
          </p>
          <div className="flex items-center justify-between gap-2">
            <MenuButton
              label="More fields"
              opensUpward
              isUnavailable={isSaveInert}
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
            <div className="flex items-center gap-2">
              {!isNew && (
                <Button
                  variant="danger"
                  aria-disabled={isSaveInert || undefined}
                  onClick={() => {
                    if (!isSaveInert) setConfirmingDelete(true);
                  }}
                >
                  Delete
                </Button>
              )}
              <Button
                variant="primary"
                type="submit"
                // Not `disabled`, which would move keyboard focus away from the button.
                aria-disabled={isSaveInert || undefined}
                aria-describedby={saveStatusId}
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      </form>
      {isConfirmingDelete && (
        <ModalDialog
          title="Delete this flashcard?"
          description={`The flashcard for “${content.word}” is deleted from the project. The deletion cannot be undone.`}
          onCancel={() => setConfirmingDelete(false)}
          footer={
            <>
              <Button autoFocus onClick={() => setConfirmingDelete(false)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  setConfirmingDelete(false);
                  onDelete();
                }}
              >
                Delete
              </Button>
            </>
          }
        />
      )}
    </>
  );
}

const saveFailedText = "Could not save the flashcard. Press Save to try again.";

const saveStatusTexts = {
  idle: "",
  waitingForDefinitions: "Waiting for definitions…",
  saving: "Saving…",
};
