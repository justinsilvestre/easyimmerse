import {
  actions,
  type FlashcardEditorState,
  selectFlashcardEditor,
  selectLookup,
} from "@easyimmerse/state";
import type { NewFlashcard } from "@easyimmerse/types";
import { useEffect, useId, useRef } from "react";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { useDocumentListener } from "../hooks/useDocumentListener.ts";
import { FlashcardEditorFooter } from "./FlashcardEditorFooter.tsx";
import { FlashcardField } from "./FlashcardField.tsx";
import { FlashcardFieldAddMenu } from "./FlashcardFieldAddMenu.tsx";
import { FlashcardTagsEditor } from "./FlashcardTagsEditor.tsx";

type FlashcardEditorProps = {
  /** Receives the edited card and the id of the saved card it updates, or null for a new card. The caller closes the editor once the card is saved. */
  onSave: (card: NewFlashcard, flashcardId: string | null) => void;
  onDelete: (flashcardId: string | null) => void;
};

/**
 * Edits the card in the flashcard editor, in a dialog.
 * Cmd+Enter or Ctrl+Enter saves, and Escape cancels unless the dictionary pop-up is open above the dialog.
 */
export function FlashcardEditor(props: FlashcardEditorProps) {
  const editor = useAppSelector(selectFlashcardEditor);
  if (editor.kind === "closed") return null;
  return <OpenFlashcardEditor editor={editor} {...props} />;
}

function OpenFlashcardEditor({
  editor: { card, flashcardId },
  onSave,
  onDelete,
}: FlashcardEditorProps & {
  editor: Extract<FlashcardEditorState, { kind: "editing" }>;
}) {
  const dispatch = useAppDispatch();
  const isLookupOpen = useAppSelector(selectLookup).kind === "open";
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const cancel = () => dispatch(actions.flashcardEditorClosed());
  const save = () => onSave(card, flashcardId);
  useEffect(() => panel.current?.focus(), []);
  useDocumentListener("keydown", (event) => {
    if (event.key === "Escape" && !isLookupOpen) cancel();
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) save();
  });
  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-gray-900/40 sm:items-center sm:p-4">
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="flex max-h-[90vh] w-full flex-col rounded-t-xl bg-white text-gray-900 shadow-xl focus:outline-none sm:max-w-lg sm:rounded-xl"
      >
        <h2 id={titleId} className="px-5 pt-4 pb-2 text-lg font-semibold">
          {flashcardId === null ? "New flashcard" : "Edit flashcard"}
        </h2>
        <form
          className="flex min-h-0 flex-col"
          onSubmit={(event) => {
            event.preventDefault();
            save();
          }}
        >
          <div className="flex flex-col gap-4 overflow-y-auto px-5 py-2">
            {card.fields.map((field) => (
              <FlashcardField key={field.kind} field={field} clip={card.clip} />
            ))}
            <FlashcardFieldAddMenu fields={card.fields} />
            <FlashcardTagsEditor
              tags={card.tags}
              onChange={(tags) => dispatch(actions.flashcardTagsEdited(tags))}
            />
          </div>
          <FlashcardEditorFooter
            isSaved={flashcardId !== null}
            onDelete={() => onDelete(flashcardId)}
            onCancel={cancel}
          />
        </form>
      </div>
    </div>
  );
}
