import type { FlashcardSettings, ProjectSettings } from "@easyimmerse/types";
import { type ReactNode, useId, useReducer } from "react";
import { Button } from "./Button.tsx";
import { CheckboxField } from "./CheckboxField.tsx";
import { FlashcardFieldPicker } from "./FlashcardFieldPicker.tsx";
import { FlashcardPresetPicker } from "./FlashcardPresetPicker.tsx";
import { FlashcardPreview } from "./FlashcardPreview.tsx";
import { LanguageSelect } from "./LanguageSelect.tsx";
import { projectSettingsReducer } from "./projectSettingsReducer.ts";
import { TagsInput } from "./TagsInput.tsx";
import { TextInput } from "./TextInput.tsx";

/** Collects the settings for a new project, or edits those of an existing one. */
export function ProjectSettingsForm({
  initialSettings,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initialSettings: ProjectSettings;
  submitLabel: string;
  onSubmit: (settings: ProjectSettings) => void;
  onCancel: () => void;
}) {
  const [settings, dispatch] = useReducer(
    projectSettingsReducer,
    initialSettings,
  );
  const flashcardSettings = settings.flashcard_settings;
  const missingSettings = listMissingSettings(settings);
  const changeProject = (
    changes: Partial<Omit<ProjectSettings, "flashcard_settings">>,
  ) => dispatch({ type: "projectChanged", changes });
  const changeFlashcardSettings = (changes: Partial<FlashcardSettings>) =>
    dispatch({ type: "flashcardSettingsChanged", changes });
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(trimSettings(settings));
      }}
      className="mx-auto grid w-full max-w-5xl gap-x-12 gap-y-10 lg:grid-cols-[minmax(0,1fr)_20rem]"
    >
      <div className="flex flex-col gap-10">
        <FormSection title="Project">
          <TextInput
            label="Name"
            value={settings.name}
            placeholder="Dark, season one"
            onChange={(name) => changeProject({ name })}
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <LanguageSelect
              label="Target language"
              value={settings.target_language}
              onChange={(target_language) => changeProject({ target_language })}
            />
            <LanguageSelect
              label="Translation language"
              value={settings.translation_language}
              onChange={(translation_language) =>
                changeProject({ translation_language })
              }
            />
          </div>
        </FormSection>
        <FormSection title="Flashcards">
          <FlashcardPresetPicker
            includedFields={flashcardSettings.included_fields}
            onPresetChosen={(preset) =>
              dispatch({ type: "presetChosen", preset })
            }
          />
          <FlashcardFieldPicker
            includedFields={flashcardSettings.included_fields}
            onChange={(included_fields) =>
              changeFlashcardSettings({ included_fields })
            }
          />
          <TagsInput
            label="Default tags"
            tags={flashcardSettings.default_tags}
            onChange={(default_tags) =>
              changeFlashcardSettings({ default_tags })
            }
          />
          <div className="flex flex-col gap-3">
            <CheckboxField
              label="Tag cards with the media file name"
              checked={flashcardSettings.tag_with_media_name}
              onChange={(tag_with_media_name) =>
                changeFlashcardSettings({ tag_with_media_name })
              }
            />
            <CheckboxField
              label="Use text-to-speech when there is no audio track"
              checked={flashcardSettings.use_tts_when_no_audio}
              onChange={(use_tts_when_no_audio) =>
                changeFlashcardSettings({ use_tts_when_no_audio })
              }
            />
          </div>
        </FormSection>
      </div>
      <PreviewColumn>
        <FlashcardPreview
          settings={flashcardSettings}
          targetLanguage={settings.target_language}
          translationLanguage={settings.translation_language}
        />
      </PreviewColumn>
      <footer className="flex flex-wrap items-center justify-end gap-3 border-t border-line pt-5 lg:col-start-1">
        {missingSettings.length > 0 && (
          <p className="mr-auto text-sm text-fg-muted">
            Add {missingSettings.join(" and ")} to continue.
          </p>
        )}
        <Button onClick={onCancel}>Cancel</Button>
        <Button
          type="submit"
          variant="primary"
          disabled={missingSettings.length > 0}
        >
          {submitLabel}
        </Button>
      </footer>
    </form>
  );
}

function FormSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-6">
      <h2 id={headingId} className="text-lg font-semibold text-fg">
        {title}
      </h2>
      {children}
    </section>
  );
}

function PreviewColumn({ children }: { children: ReactNode }) {
  const headingId = useId();
  return (
    <aside
      aria-labelledby={headingId}
      className="flex flex-col gap-4 lg:sticky lg:top-4 lg:row-span-2 lg:self-start"
    >
      <h2 id={headingId} className="text-lg font-semibold text-fg">
        Preview
      </h2>
      {children}
    </aside>
  );
}

function listMissingSettings(settings: ProjectSettings): string[] {
  return [
    settings.name.trim() === "" && "a name",
    settings.target_language.trim() === "" && "a target language",
    settings.translation_language.trim() === "" && "a translation language",
  ].filter((missing) => missing !== false);
}

function trimSettings(settings: ProjectSettings): ProjectSettings {
  return {
    ...settings,
    name: settings.name.trim(),
    target_language: settings.target_language.trim(),
    translation_language: settings.translation_language.trim(),
  };
}
