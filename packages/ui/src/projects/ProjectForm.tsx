import type { ProjectSettings } from "@easyimmerse/types";
import { type ReactNode, useId, useReducer } from "react";
import { Button } from "../components/Button.tsx";
import { CheckboxField } from "../components/CheckboxField.tsx";
import { SelectField } from "../components/SelectField.tsx";
import { TagsField } from "../components/TagsField.tsx";
import { TextField } from "../components/TextField.tsx";
import { reduceProjectForm } from "./editProject.ts";
import { languageOptions } from "./languages.ts";
import { PresetPicker } from "./PresetPicker.tsx";
import { ProjectFormFields } from "./ProjectFormFields.tsx";
import { ProjectFormPreview } from "./ProjectFormPreview.tsx";

/**
 * The settings of a new or existing project, with a preview of a flashcard made under them.
 * On a wide screen the preview stands beside the form; on a narrow one it sits under the preset, small until expanded.
 * While the translation language is the target language, a hint asks for another and the form cannot be submitted.
 */
export function ProjectForm({
  initialValues,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initialValues: ProjectSettings;
  submitLabel: string;
  onSubmit: (values: ProjectSettings) => void;
  onCancel: () => void;
}) {
  const [state, dispatch] = useReducer(reduceProjectForm, initialValues);
  const sameLanguageHintId = useId();
  const hasSameLanguages = state.target_language === state.translation_language;
  return (
    <form
      className="grid gap-6 md:grid-cols-[1fr_20rem] md:gap-x-8"
      onSubmit={(event) => {
        event.preventDefault();
        if (!hasSameLanguages) onSubmit(state);
      }}
    >
      <Column>
        <TextField
          label="Project name"
          value={state.name}
          placeholder="German"
          required
          onChange={(event) =>
            dispatch({ type: "nameChanged", value: event.target.value })
          }
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Target language"
            hint="The language you are learning."
            options={languageOptions}
            value={state.target_language}
            onChange={(event) =>
              dispatch({
                type: "targetLanguageChanged",
                value: event.target.value,
              })
            }
          />
          <div className="flex flex-col gap-1">
            <SelectField
              label="Translation language"
              hint="Translations and definitions in this language."
              options={languageOptions}
              value={state.translation_language}
              aria-invalid={hasSameLanguages || undefined}
              aria-describedby={
                hasSameLanguages ? sameLanguageHintId : undefined
              }
              onChange={(event) =>
                dispatch({
                  type: "translationLanguageChanged",
                  value: event.target.value,
                })
              }
            />
            {hasSameLanguages && (
              <p id={sameLanguageHintId} className="text-xs text-danger-fg">
                Choose a different language from the target language.
              </p>
            )}
          </div>
        </div>
      </Column>
      <Column>
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold">Flashcards</h2>
          <p className="text-sm text-fg-muted">
            Which fields a new flashcard starts with. You can add a hidden field
            back on any single flashcard.
          </p>
        </div>
        <PresetPicker
          fields={state.flashcard_fields}
          onPresetChosen={(preset) =>
            dispatch({ type: "presetChosen", preset })
          }
        >
          <ProjectFormFields values={state} dispatch={dispatch} />
        </PresetPicker>
      </Column>
      <ProjectFormPreview values={state} />
      <Column>
        <TagsField
          label="Default tags"
          tags={state.default_tags}
          onChange={(tags) => dispatch({ type: "defaultTagsChanged", tags })}
        />
        <CheckboxField
          label="Tag each flashcard with the name of its media file"
          checked={state.tags_media_name}
          onChange={() => dispatch({ type: "mediaNameTagToggled" })}
        />
        <CheckboxField
          label="Fill the audio fields with text-to-speech when the media has no audio track"
          hint="Applies to ebooks and text files."
          checked={state.fills_audio_with_tts}
          onChange={() => dispatch({ type: "ttsToggled" })}
        />
      </Column>
      <div className="flex justify-end gap-2 md:col-start-1">
        <Button onClick={onCancel}>Cancel</Button>
        <Button
          variant="primary"
          type="submit"
          // Not `disabled`, which would move keyboard focus away from the button.
          aria-disabled={hasSameLanguages || undefined}
          aria-describedby={hasSameLanguages ? sameLanguageHintId : undefined}
        >
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

/** A block of the form's left column. The preview takes the right column on wide screens. */
function Column({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-4 md:col-start-1">{children}</div>;
}
