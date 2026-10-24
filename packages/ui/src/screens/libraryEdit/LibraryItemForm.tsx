import type {
  LibraryDifficulty,
  LibraryItem,
  LibraryItemDraft,
} from "@easyimmerse/types";
import { useReducer, useState } from "react";
import { Button } from "../../components/common/Button.tsx";
import { SelectField } from "../../components/common/SelectField.tsx";
import { TagsField } from "../../components/common/TagsField.tsx";
import { TextField } from "../../components/common/TextField.tsx";
import { languageOptions } from "../../lib/formatting/languages.ts";
import {
  formatLibraryDuration,
  libraryDifficultyLabels,
} from "../../lib/library/libraryLabels.ts";
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
 * The metadata of a library item: its title, description, languages, difficulty and tags, and for a video, the moment its cover is taken from,
 * which the library manager picks in a preview of the video. These can change whatever the item's status,
 * except the languages, which are fixed while the item is being prepared or is published.
 */
export function LibraryItemForm({
  item,
  previewUrl,
  isSaving,
  onSave,
}: {
  item: LibraryItem;
  /** The address of the item's uploaded file, which the cover is picked from, or null when it cannot be played here. */
  previewUrl: string | null;
  isSaving: boolean;
  onSave: (draft: LibraryItemDraft) => void;
}) {
  const [draft, change] = useReducer(changed, item, libraryDraftOf);
  // The languages decide how the text was divided into words, so they change only with the words.
  const areLanguagesLocked = libraryLockOf(item.status) !== null;
  return (
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
      <div className="grid gap-3 sm:grid-cols-3">
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
        hint="Learners filter the library by these."
        onChange={(tags) => change({ tags: [...tags] })}
      />
      {item.kind === "video" && (
        <CoverTime
          previewUrl={previewUrl}
          coverAtMs={draft.cover_at_ms}
          onChange={(cover_at_ms) => change({ cover_at_ms })}
        />
      )}
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
  );
}

/** The moment of the video the cover is taken from, picked by pausing or seeking the preview there. */
function CoverTime({
  previewUrl,
  coverAtMs,
  onChange,
}: {
  previewUrl: string | null;
  coverAtMs: number | null;
  onChange: (coverAtMs: number | null) => void;
}) {
  const [shownMs, setShownMs] = useState(0);
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-sm font-medium">Cover picture</legend>
      <p className="text-sm text-fg-muted">
        {coverAtMs === null
          ? "Taken from the first line's screenshot."
          : `Taken from ${formatLibraryDuration(coverAtMs)} into the video.`}
      </p>
      {previewUrl && (
        // The preview has no captions: it only serves to find the moment of the cover.
        // biome-ignore lint/a11y/useMediaCaption: see above
        <video
          src={previewUrl}
          controls
          preload="metadata"
          aria-label="Preview"
          onTimeUpdate={(event) =>
            setShownMs(Math.round(event.currentTarget.currentTime * 1000))
          }
          className="aspect-video w-full max-w-md rounded-md bg-black"
        />
      )}
      <div className="flex flex-wrap gap-2">
        {previewUrl && (
          <Button size="sm" onClick={() => onChange(shownMs)}>
            {`Use the frame at ${formatLibraryDuration(shownMs)}`}
          </Button>
        )}
        {coverAtMs !== null && (
          <Button size="sm" variant="subtle" onClick={() => onChange(null)}>
            Use the first line's screenshot
          </Button>
        )}
      </div>
    </fieldset>
  );
}
