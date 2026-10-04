import clsx from "clsx";
import { useState } from "react";
import { CheckboxField } from "../components/CheckboxField.tsx";
import {
  type FlashcardFieldGroup,
  flashcardFieldGroups,
  flashcardFields,
  labelOfFieldGroup,
} from "../flashcards/flashcardFields.ts";
import type { ProjectFormAction, ProjectFormValues } from "./editProject.ts";

/**
 * The checkboxes for the fields a new flashcard starts with, grouped by language.
 * On a wide screen the groups stand side by side; on a narrow one, tabs show one group at a time.
 */
export function ProjectFormFields({
  values,
  dispatch,
}: {
  values: ProjectFormValues;
  dispatch: (action: ProjectFormAction) => void;
}) {
  const [openGroup, setOpenGroup] = useState<FlashcardFieldGroup>("target");
  const languages = {
    target: values.target_language,
    translation: values.translation_language,
  };
  return (
    <div className="flex flex-col gap-3">
      <div
        role="tablist"
        aria-label="Field groups"
        className="flex border-b border-line sm:hidden"
      >
        {flashcardFieldGroups.map((group) => (
          <button
            key={group}
            type="button"
            role="tab"
            aria-selected={group === openGroup}
            onClick={() => setOpenGroup(group)}
            className={clsx(
              "-mb-px border-b-2 px-3 py-1.5 text-sm focus-visible:outline-2 focus-visible:outline-accent",
              group === openGroup
                ? "border-accent font-medium text-fg"
                : "border-transparent text-fg-muted hover:text-fg",
            )}
          >
            {labelOfFieldGroup(group, languages)}
          </button>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {flashcardFieldGroups.map((group) => (
          <fieldset
            key={group}
            className={clsx(
              "flex-col gap-2",
              group === openGroup ? "flex" : "hidden sm:flex",
            )}
          >
            <legend className="mb-2 hidden text-xs font-medium text-fg-muted sm:block">
              {labelOfFieldGroup(group, languages)}
            </legend>
            {flashcardFields
              .filter((field) => field.group === group)
              .map((field) => (
                <CheckboxField
                  key={field.key}
                  label={field.label(languages)}
                  checked={values.flashcard_fields.includes(field.key)}
                  onChange={() =>
                    dispatch({ type: "fieldToggled", key: field.key })
                  }
                />
              ))}
          </fieldset>
        ))}
      </div>
    </div>
  );
}
