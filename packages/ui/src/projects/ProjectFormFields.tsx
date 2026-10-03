import { CheckboxField } from "../components/CheckboxField.tsx";
import {
  flashcardFieldGroups,
  flashcardFields,
  labelOfFieldGroup,
} from "../flashcards/flashcardFields.ts";
import type { ProjectFormAction, ProjectFormValues } from "./editProject.ts";

/** The checkboxes for the fields a new flashcard starts with, grouped by language. */
export function ProjectFormFields({
  values,
  dispatch,
}: {
  values: ProjectFormValues;
  dispatch: (action: ProjectFormAction) => void;
}) {
  const languages = {
    target: values.targetLanguage,
    translation: values.translationLanguage,
  };
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {flashcardFieldGroups.map((group) => (
        <fieldset key={group} className="flex flex-col gap-2">
          <legend className="mb-2 text-xs font-medium text-fg-muted">
            {labelOfFieldGroup(group, languages)}
          </legend>
          {flashcardFields
            .filter((field) => field.group === group)
            .map((field) => (
              <CheckboxField
                key={field.key}
                label={field.label(languages)}
                checked={values.flashcardFields.includes(field.key)}
                onChange={() =>
                  dispatch({ type: "fieldToggled", key: field.key })
                }
              />
            ))}
        </fieldset>
      ))}
    </div>
  );
}
