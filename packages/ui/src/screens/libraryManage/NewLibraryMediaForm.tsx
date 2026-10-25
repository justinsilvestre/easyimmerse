import { Plus } from "lucide-react";
import { Button } from "../../components/common/Button.tsx";
import { SelectField } from "../../components/common/SelectField.tsx";
import { languageOptions } from "../../lib/formatting/languages.ts";

/** Whether media can be added: at once, once what it needs has loaded, or once the new item being made is done. */
export type NewLibraryMediaStatus = "ready" | "waiting" | "adding";

/**
 * The way to add media to the library: the language of the media while the library has no items, which becomes the library's language,
 * the translation language of the new item, and the "Add media" button,
 * which opens the file picker for a video, an audio file or a text, as a project's button does.
 */
export function NewLibraryMediaForm({
  status,
  languageChoice,
  onAddMedia,
}: {
  status: NewLibraryMediaStatus;
  /** The language first chosen in the "Language" select, or null for no select, once the library's language is fixed. */
  languageChoice: string | null;
  /** Adds media in the chosen language, or in the library's fixed language for null, with translations and definitions in the translation language. */
  onAddMedia: (language: string | null, translationLanguage: string) => void;
}) {
  return (
    <form
      aria-label="New library item"
      className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-4"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const chosen = form.get("language");
        if (status === "ready")
          onAddMedia(
            chosen === null ? null : String(chosen),
            String(form.get("translationLanguage")),
          );
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {languageChoice !== null && (
          <SelectField
            label="Language"
            name="language"
            hint="The language of every video, audio file and text in the library."
            options={languageOptions}
            defaultValue={languageChoice}
          />
        )}
        <SelectField
          label="Translation language"
          name="translationLanguage"
          hint="Translations and definitions in this language."
          options={languageOptions}
          defaultValue="en"
        />
      </div>
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
