import type {
  LibraryDifficulty,
  LibraryItem,
  LibraryItemDraft,
} from "@easyimmerse/types";
import { useReducer } from "react";
import { Button } from "../../components/common/Button.tsx";
import { SelectField } from "../../components/common/SelectField.tsx";
import { TagsField } from "../../components/common/TagsField.tsx";
import { TextField } from "../../components/common/TextField.tsx";
import { languageOptions } from "../../lib/formatting/languages.ts";
import { libraryDifficultyLabels } from "../../lib/library/libraryLabels.ts";
import { LibraryCoverPicker } from "./LibraryCoverPicker.tsx";
import { libraryDraftOf } from "./libraryDraftOf.ts";
import { libraryLockOf } from "./libraryLock.ts";

const difficultyOptions = [
  { value: "", label: "Not set" },
  ...Object.entries(libraryDifficultyLabels).map(([value, label]) => ({
    value,
    label,
  })),
];

function changed(draft: LibraryItemDraft, changes: Partial<LibraryItemDraft>) {
  return { ...draft, ...changes };
}

/**
 * The metadata of a library item: its title, description, languages, difficulty and tags, saved together,
 * and its cover picture, which changes at once. These can change whatever the item's status,
 * except the languages, which are fixed while the item is being prepared or is published.
 */
export function LibraryItemForm({
  item,
  coverUrl,
  previewUrl,
  isSaving,
  isChangingCover,
  onSave,
  onUploadCover,
  onChooseCoverFrame,
  onResetCover,
}: {
  item: LibraryItem;
  /** The image of the item's cover, or null when it has none to show. */
  coverUrl: string | null;
  /** The address of the item's uploaded file, which a cover frame is picked from, or null when it cannot be played here. */
  previewUrl: string | null;
  isSaving: boolean;
  isChangingCover: boolean;
  onSave: (draft: LibraryItemDraft) => void;
  onUploadCover: (file: File) => void;
  onChooseCoverFrame: (atMs: number) => void;
  /** Gives the item its automatic cover again. */
  onResetCover: () => void;
}) {
  const [draft, change] = useReducer(changed, item, libraryDraftOf);
  // The languages decide how the text was divided into words, so they change only with the words.
  const areLanguagesLocked = libraryLockOf(item.status) !== null;
  return (
    <div className="flex flex-col gap-6">
      <form
        aria-label="Item details"
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (!isSaving) onSave(draft);
        }}
      >
        <h2 className="font-semibold">Details</h2>
        <TextField
          label="Title"
          value={draft.title}
          required
          onChange={(event) => change({ title: event.target.value })}
        />
        <TextField
          label="Description"
          multiline
          value={draft.description}
          onChange={(event) => change({ description: event.target.value })}
        />
        <div className="grid items-start gap-3 sm:grid-cols-3">
          <SelectField
            label="Language"
            options={languageOptions}
            value={draft.language}
            disabled={areLanguagesLocked}
            onChange={(event) => change({ language: event.target.value })}
          />
          <SelectField
            label="Translation language"
            options={languageOptions}
            value={draft.translation_language}
            disabled={areLanguagesLocked}
            onChange={(event) =>
              change({ translation_language: event.target.value })
            }
          />
          <SelectField
            label="Difficulty"
            options={difficultyOptions}
            hint="A level of the Common European Framework of Reference for Languages (CEFR)."
            value={draft.difficulty ?? ""}
            onChange={(event) =>
              change({
                difficulty: (event.target.value ||
                  null) as LibraryDifficulty | null,
              })
            }
          />
        </div>
        <TagsField
          label="Tags"
          tags={draft.tags}
          hint="Learners can pick tags in the library to see only the items that have them."
          onChange={(tags) => change({ tags: [...tags] })}
        />
        <div>
          <Button
            type="submit"
            variant="primary"
            aria-disabled={isSaving || undefined}
          >
            {isSaving ? "Saving…" : "Save details"}
          </Button>
        </div>
      </form>
      <LibraryCoverPicker
        item={item}
        coverUrl={coverUrl}
        previewUrl={previewUrl}
        isChanging={isChangingCover}
        onUpload={onUploadCover}
        onChooseFrame={onChooseCoverFrame}
        onReset={onResetCover}
      />
    </div>
  );
}
