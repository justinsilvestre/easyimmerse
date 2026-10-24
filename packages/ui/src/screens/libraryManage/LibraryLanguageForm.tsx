import { Button } from "../../components/common/Button.tsx";
import { SelectField } from "../../components/common/SelectField.tsx";
import { languageOptions } from "../../lib/formatting/languages.ts";

/**
 * The form that sets the language of every item in the library, which learners of that language study.
 * `onCancel` is given while the library already has a language, which cancelling keeps.
 */
export function LibraryLanguageForm({
  language,
  isSaving,
  onSetLanguage,
  onCancel,
}: {
  /** The library's language, or null while it has none. */
  language: string | null;
  isSaving: boolean;
  onSetLanguage: (language: string) => void;
  onCancel?: () => void;
}) {
  return (
    <form
      aria-label="Library language"
      className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-4"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        if (!isSaving) onSetLanguage(String(form.get("language")));
      }}
    >
      <h2 className="font-semibold">Which language is this library for?</h2>
      <SelectField
        label="Language"
        name="language"
        className="max-w-xs"
        hint="The language of every video, audio file and text in the library. It can't change once the library has items."
        options={languageOptions}
        defaultValue={language ?? "de"}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          variant="primary"
          aria-disabled={isSaving || undefined}
        >
          {isSaving ? "Setting…" : "Set language"}
        </Button>
        {onCancel && (
          <Button variant="subtle" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
