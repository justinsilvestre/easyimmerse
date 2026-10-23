import { Upload } from "lucide-react";
import { useState } from "react";
import { Button } from "../components/Button.tsx";
import { SegmentedControl } from "../components/SegmentedControl.tsx";
import { SelectField } from "../components/SelectField.tsx";
import { TextField } from "../components/TextField.tsx";
import { languageOptions } from "../projects/languages.ts";
import { FileField } from "./FileField.tsx";
import {
  mediaFileTypes,
  subtitleFileTypes,
  textFileTypes,
} from "./libraryFileTypes.ts";
import {
  type LibraryUpload,
  type NewLibraryItem,
  newLibraryItemOf,
} from "./newLibraryItem.ts";

const uploadOptions = [
  { value: "media", label: "Video or audio" },
  { value: "text", label: "Text" },
] as const;

/**
 * The form that adds an item to the library: its title and languages, and either a video or audio file with its subtitles file
 * and an optional translation subtitles file, or a text file on its own.
 */
export function NewLibraryItemForm({
  isCreating,
  failure,
  onCreate,
}: {
  isCreating: boolean;
  /** Why the last attempt failed, or null. */
  failure: string | null;
  onCreate: (item: NewLibraryItem) => void;
}) {
  const [upload, setUpload] = useState<LibraryUpload>("media");
  return (
    <form
      aria-label="New library item"
      className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-4"
      onSubmit={(event) => {
        event.preventDefault();
        const item = newLibraryItemOf(
          new FormData(event.currentTarget),
          upload,
        );
        if (item && !isCreating) onCreate(item);
      }}
    >
      <h2 className="font-semibold">New item</h2>
      <TextField
        label="Title"
        name="title"
        hint="The file's name when left empty."
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField
          label="Language"
          name="language"
          options={languageOptions}
          defaultValue="de"
        />
        <SelectField
          label="Translation language"
          name="translationLanguage"
          options={languageOptions}
          defaultValue="en"
        />
      </div>
      <SegmentedControl
        label="File"
        options={uploadOptions}
        value={upload}
        onChange={setUpload}
      />
      {upload === "media" ? (
        <div className="flex flex-col gap-3">
          <FileField
            label="Video or audio file"
            name="media"
            accept={mediaFileTypes}
            required
          />
          <FileField
            label="Subtitles file"
            name="subtitles"
            accept={subtitleFileTypes}
            required
          />
          <FileField
            label="Translation subtitles file"
            name="translationSubtitles"
            accept={subtitleFileTypes}
            hint="Optional."
          />
        </div>
      ) : (
        <FileField
          label="Text file"
          name="text"
          accept={textFileTypes}
          hint="A plain text file or an EPUB book. Each paragraph becomes a line of the item."
          required
        />
      )}
      {failure && (
        <p role="alert" className="text-sm text-danger-fg">
          {failure}
        </p>
      )}
      <div>
        <Button
          type="submit"
          variant="primary"
          aria-disabled={isCreating || undefined}
        >
          <Upload className="size-4" aria-hidden />
          {isCreating ? "Uploading…" : "Add to the library"}
        </Button>
      </div>
    </form>
  );
}
