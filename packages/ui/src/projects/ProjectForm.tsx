import { type ReactNode, useReducer } from "react";
import { Button } from "../components/Button.tsx";
import { CheckboxField } from "../components/CheckboxField.tsx";
import { SegmentedControl } from "../components/SegmentedControl.tsx";
import { SelectField } from "../components/SelectField.tsx";
import { TextField } from "../components/TextField.tsx";
import { exampleFlashcard } from "../flashcards/exampleFlashcard.ts";
import { FlashcardPreview } from "../flashcards/FlashcardPreview.tsx";
import {
  type FlashcardFieldGroup,
  type FlashcardFieldKey,
  flashcardFieldGroupLabels,
  flashcardFields,
  toggleField,
} from "../flashcards/flashcardFields.ts";
import {
  type FlashcardPreset,
  fieldsOfPreset,
  flashcardPresetOptions,
  presetMatching,
} from "../flashcards/flashcardPresets.ts";
import { parseTags } from "../flashcards/parseTags.ts";
import { languageOptions } from "./languages.ts";

export type ProjectFormValues = {
  name: string;
  targetLanguage: string;
  translationLanguage: string;
  flashcardFields: readonly FlashcardFieldKey[];
  defaultTags: readonly string[];
  fillsAudioWithTts: boolean;
};

/** The values plus the tags field's text, which keeps the comma the user is about to follow with another tag. */
type FormState = ProjectFormValues & { defaultTagsText: string };

type FormAction =
  | { type: "nameChanged"; value: string }
  | { type: "targetLanguageChanged"; value: string }
  | { type: "translationLanguageChanged"; value: string }
  | { type: "presetChosen"; preset: FlashcardPreset }
  | { type: "fieldToggled"; key: FlashcardFieldKey }
  | { type: "defaultTagsChanged"; text: string }
  | { type: "ttsToggled" };

const presetOptions = [
  ...flashcardPresetOptions,
  { value: "custom", label: "Custom" },
] as const;

const groups: FlashcardFieldGroup[] = ["word", "context", "media"];

/** The settings of a new or existing project, with a preview of a flashcard made under them. */
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
  const [state, dispatch] = useReducer(reduceForm, initialValues, (values) => ({
    ...values,
    defaultTagsText: values.defaultTags.join(", "),
  }));
  return (
    <form
      className="grid gap-8 md:grid-cols-[1fr_20rem]"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(valuesOf(state));
      }}
    >
      <div className="flex flex-col gap-8">
        <Section title="Project">
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
        </Section>
        <Section
          title="Flashcards"
          description="Which fields a new flashcard starts with. You can add a hidden field back on any single flashcard."
        >
          <SegmentedControl
            label="Flashcard preset"
            options={presetOptions}
            value={presetMatching(state.flashcardFields)}
            onChange={(preset) =>
              preset !== "custom" && dispatch({ type: "presetChosen", preset })
            }
          />
          <div className="grid gap-4 sm:grid-cols-3">
            {groups.map((group) => (
              <fieldset key={group} className="flex flex-col gap-2">
                <legend className="mb-2 text-xs font-medium text-fg-muted">
                  {flashcardFieldGroupLabels[group]}
                </legend>
                {flashcardFields
                  .filter((field) => field.group === group)
                  .map((field) => (
                    <CheckboxField
                      key={field.key}
                      label={field.label}
                      checked={state.flashcardFields.includes(field.key)}
                      onChange={() =>
                        dispatch({ type: "fieldToggled", key: field.key })
                      }
                    />
                  ))}
              </fieldset>
            ))}
          </div>
          <TextField
            label="Default tags"
            hint="Separate tags with commas. The media file's name is always added as a tag."
            value={state.defaultTagsText}
            onChange={(event) =>
              dispatch({ type: "defaultTagsChanged", text: event.target.value })
            }
          />
          <CheckboxField
            label="Fill the audio fields with text-to-speech when the media has no audio track"
            hint="Applies to ebooks and text files."
            checked={state.fillsAudioWithTts}
            onChange={() => dispatch({ type: "ttsToggled" })}
          />
        </Section>
        <div className="flex justify-end gap-2">
          <Button onClick={onCancel}>Cancel</Button>
          <Button variant="primary" type="submit">
            {submitLabel}
          </Button>
        </div>
      </div>
      <aside className="flex flex-col gap-2 md:sticky md:top-4 md:self-start">
        <h2 className="text-sm font-medium text-fg-muted">Example flashcard</h2>
        <FlashcardPreview
          content={{
            ...exampleFlashcard,
            tags: [...new Set([...state.defaultTags, "sample"])],
          }}
          includedFields={state.flashcardFields}
        />
      </aside>
    </form>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold">{title}</h2>
        {description && <p className="text-sm text-fg-muted">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function valuesOf({
  defaultTagsText: _,
  ...values
}: FormState): ProjectFormValues {
  return values;
}

function reduceForm(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case "nameChanged":
      return { ...state, name: action.value };
    case "targetLanguageChanged":
      return { ...state, targetLanguage: action.value };
    case "translationLanguageChanged":
      return { ...state, translationLanguage: action.value };
    case "presetChosen":
      return { ...state, flashcardFields: fieldsOfPreset(action.preset) };
    case "fieldToggled":
      return {
        ...state,
        flashcardFields: toggleField(state.flashcardFields, action.key),
      };
    case "defaultTagsChanged":
      return {
        ...state,
        defaultTagsText: action.text,
        defaultTags: parseTags(action.text),
      };
    case "ttsToggled":
      return { ...state, fillsAudioWithTts: !state.fillsAudioWithTts };
  }
}
