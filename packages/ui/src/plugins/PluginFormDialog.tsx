import type {
  FormAction,
  FormActionStyle,
  FormInput,
  PluginForm,
} from "@easyimmerse/types";
import { type ReactNode, useId } from "react";
import { Button } from "../components/Button.tsx";
import { ModalDialog } from "../components/ModalDialog.tsx";
import { PluginFormField } from "./PluginFormField.tsx";
import { usePluginFormValues } from "./usePluginFormValues.ts";

/**
 * A dialog showing a form a plugin asked for, with a button for each of its actions and one to close it.
 * What the user enters is kept until a different form arrives. Pressing Enter in a field presses the form's primary action.
 * While there is no form yet, the dialog is named `fallbackTitle` and shows only its children,
 * which also follow the form's fields, for such things as progress and errors.
 */
export function PluginFormDialog({
  form,
  fallbackTitle,
  isBusy,
  onAction,
  onClose,
  closeLabel = "Cancel",
  children,
}: {
  form: PluginForm | null;
  fallbackTitle: string;
  /** Whether the plugin is working on an earlier action, which locks the fields and actions. */
  isBusy: boolean;
  onAction: (actionId: string, input: FormInput[]) => void;
  onClose: () => void;
  closeLabel?: string;
  children?: ReactNode;
}) {
  const formId = useId();
  const { values, change, input } = usePluginFormValues(form);
  const press = (actionId: string) => {
    if (!isBusy) onAction(actionId, input());
  };
  const submitAction = form && submitActionOf(form.actions);
  return (
    <ModalDialog
      title={form?.title ?? fallbackTitle}
      description={form?.description ?? undefined}
      onCancel={onClose}
      footer={
        <>
          <Button onClick={onClose}>{closeLabel}</Button>
          <PluginFormActions
            actions={form?.actions ?? []}
            formId={formId}
            isBusy={isBusy}
            onPress={press}
          />
        </>
      }
    >
      {form && (
        <form
          id={formId}
          onSubmit={(event) => {
            event.preventDefault();
            if (submitAction) press(submitAction.id);
          }}
        >
          <fieldset disabled={isBusy} className="flex flex-col gap-4">
            {form.fields.map((field) => (
              <PluginFormField
                key={field.id}
                field={field}
                values={values[field.id] ?? []}
                onChange={(fieldValues) => change(field.id, fieldValues)}
              />
            ))}
          </fieldset>
        </form>
      )}
      {children}
    </ModalDialog>
  );
}

/** The form's actions as buttons. The first primary one submits the form, so that Enter in a field presses it too. */
function PluginFormActions({
  actions,
  formId,
  isBusy,
  onPress,
}: {
  actions: readonly FormAction[];
  formId: string;
  isBusy: boolean;
  onPress: (actionId: string) => void;
}) {
  const submitAction = submitActionOf(actions);
  return actions.map((action) =>
    action === submitAction ? (
      <Button
        key={action.id}
        type="submit"
        form={formId}
        variant={buttonVariants[action.style]}
        aria-disabled={isBusy}
      >
        {action.label}
      </Button>
    ) : (
      <Button
        key={action.id}
        variant={buttonVariants[action.style]}
        aria-disabled={isBusy}
        onClick={() => onPress(action.id)}
      >
        {action.label}
      </Button>
    ),
  );
}

function submitActionOf(
  actions: readonly FormAction[],
): FormAction | undefined {
  return actions.find((action) => action.style === "primary");
}

const buttonVariants = {
  primary: "primary",
  secondary: "secondary",
  destructive: "danger",
} as const satisfies Record<FormActionStyle, string>;
