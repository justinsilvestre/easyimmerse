import type {
  FormActionStyle,
  FormInput,
  PluginForm,
} from "@easyimmerse/types";
import { useReducer } from "react";
import { Button } from "../components/Button.tsx";
import { PluginFormField } from "./PluginFormField.tsx";
import {
  initialValuesOf,
  inputOf,
  pluginFormReducer,
} from "./pluginFormValues.ts";

/**
 * Shows a form a plugin asked for, with a button for each of its actions and one to close it.
 * It draws no dialog of its own, so the caller places it in a dialog or panel.
 * What the user enters is kept until a different form arrives.
 */
export function PluginFormView({
  form,
  isBusy,
  onAction,
  onClose,
  closeLabel = "Cancel",
}: {
  form: PluginForm;
  /** Whether the plugin is working on an earlier action, which disables the actions. */
  isBusy: boolean;
  onAction: (actionId: string, input: FormInput[]) => void;
  onClose: () => void;
  closeLabel?: string;
}) {
  const [state, change] = useReducer(pluginFormReducer, form, (initial) => ({
    form: initial,
    values: initialValuesOf(initial),
  }));
  const values = state.form === form ? state.values : initialValuesOf(form);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">{form.title}</h2>
        {form.description && (
          <p className="text-sm text-fg-muted">{form.description}</p>
        )}
      </div>
      {form.fields.map((field) => (
        <PluginFormField
          key={field.id}
          field={field}
          values={values[field.id] ?? []}
          onChange={(fieldValues) =>
            change({ form, field: field.id, values: fieldValues })
          }
        />
      ))}
      <div className="flex flex-wrap justify-end gap-2">
        <Button onClick={onClose}>{closeLabel}</Button>
        {form.actions.map((action) => (
          <Button
            key={action.id}
            variant={buttonVariants[action.style]}
            disabled={isBusy}
            onClick={() => onAction(action.id, inputOf(form, values))}
          >
            {action.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

const buttonVariants = {
  primary: "primary",
  secondary: "secondary",
  destructive: "danger",
} as const satisfies Record<FormActionStyle, string>;
