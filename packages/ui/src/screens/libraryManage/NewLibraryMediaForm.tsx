import { Plus } from "lucide-react";
import { Button } from "../../components/common/Button.tsx";
import { SelectField } from "../../components/common/SelectField.tsx";
import { languageOptions } from "../../lib/formatting/languages.ts";

/** Whether media can be added: at once, once what it needs has loaded, or once the new item being made is done. */
export type NewLibraryMediaStatus = "ready" | "waiting" | "adding";

/**
 * The way to add media to the library: the translation language of the new item, and the "Add media" button,
 * which opens the file picker for a video, an audio file or a text, as a project's button does.
 */
export function NewLibraryMediaForm({
  status,
  onAddMedia,
}: {
  status: NewLibraryMediaStatus;
  /** Adds media whose translations and definitions are in the given language. */
  onAddMedia: (translationLanguage: string) => void;
}) {
  return (
    <form
      aria-label="New library item"
      className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-4"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        if (status === "ready")
          onAddMedia(String(form.get("translationLanguage")));
      }}
    >
      <SelectField
        label="Translation language"
        name="translationLanguage"
        className="max-w-xs"
        hint="Translations and definitions in this language."
        options={languageOptions}
        defaultValue="en"
      />
      <div>
        <Button
          type="submit"
          variant="primary"
          aria-disabled={status !== "ready" || undefined}
        >
          <Plus className="size-4" aria-hidden />
          {status === "adding" ? "Adding…" : "Add media"}
        </Button>
      </div>
    </form>
  );
}
