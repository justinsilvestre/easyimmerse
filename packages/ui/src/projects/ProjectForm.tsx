import { type ReactNode, useReducer } from "react";
import { Button } from "../components/Button.tsx";
import { CheckboxField } from "../components/CheckboxField.tsx";
import { SegmentedControl } from "../components/SegmentedControl.tsx";
import { SelectField } from "../components/SelectField.tsx";
import { TagsField } from "../components/TagsField.tsx";
import { TextField } from "../components/TextField.tsx";
import {
  flashcardPresetOptions,
  presetMatching,
} from "../flashcards/flashcardPresets.ts";
import { type ProjectFormValues, reduceProjectForm } from "./editProject.ts";
import { languageOptions } from "./languages.ts";
import { ProjectFormFields } from "./ProjectFormFields.tsx";
import { ProjectFormPreview } from "./ProjectFormPreview.tsx";

const presetOptions = [
  ...flashcardPresetOptions,
  { value: "custom", label: "Custom" },
] as const;

/**
 * The settings of a new or existing project, with a preview of a flashcard made under them.
 * On a wide screen the preview stands beside the form; on a narrow one it sits under the preset, small until expanded.
 */
export function ProjectForm({
  initialValues,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initialValues: ProjectFormValues;
  submitLabel: string;
  onSubmit: (values: ProjectFormValues) => void;
  onCancel: () => void;
}) {
  const [state, dispatch] = useReducer(reduceProjectForm, initialValues);
  return (
    <form
      className="grid gap-6 md:grid-cols-[1fr_20rem] md:gap-x-8"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(state);
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
            value={state.targetLanguage}
            onChange={(event) =>
              dispatch({
                type: "targetLanguageChanged",
                value: event.target.value,
              })
            }
          />
          <SelectField
            label="Translation language"
            hint="Translations and definitions in this language."
            options={languageOptions}
            value={state.translationLanguage}
            onChange={(event) =>
              dispatch({
                type: "translationLanguageChanged",
                value: event.target.value,
              })
            }
          />
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
        <SegmentedControl
          label="Flashcard preset"
          options={presetOptions}
          value={presetMatching(state.flashcardFields)}
          onChange={(preset) =>
            preset !== "custom" && dispatch({ type: "presetChosen", preset })
          }
        />
      </Column>
      <ProjectFormPreview values={state} />
      <Column>
        <ProjectFormFields values={state} dispatch={dispatch} />
        <TagsField
          label="Default tags"
          tags={state.defaultTags}
          onChange={(tags) => dispatch({ type: "defaultTagsChanged", tags })}
        />
        <CheckboxField
          label="Tag each flashcard with the name of its media file"
          checked={state.tagsMediaName}
          onChange={() => dispatch({ type: "mediaNameTagToggled" })}
        />
        <CheckboxField
          label="Fill the audio fields with text-to-speech when the media has no audio track"
          hint="Applies to ebooks and text files."
          checked={state.fillsAudioWithTts}
          onChange={() => dispatch({ type: "ttsToggled" })}
        />
      </Column>
      <div className="flex justify-end gap-2 md:col-start-1">
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant="primary" type="submit">
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
