import type { FormControl, FormInput, PluginForm } from "@easyimmerse/types";

/** What the user has entered so far, as the values each field would send, keyed by field id. */
export type PluginFormValues = Readonly<Record<string, readonly string[]>>;

/** The values a form starts out with, before the user changes anything; none while there is no form. */
export function initialValuesOf(form: PluginForm | null): PluginFormValues {
  return Object.fromEntries(
    (form?.fields ?? []).map((field) => [
      field.id,
      initialValuesOfControl(field.control),
    ]),
  );
}

/** The input to send for `values`: one entry per field other than notes, in field order. */
export function inputOf(
  form: PluginForm,
  values: PluginFormValues,
): FormInput[] {
  return form.fields
    .filter((field) => field.control.kind !== "note")
    .map((field) => ({
      field: field.id,
      values: [...(values[field.id] ?? [])],
    }));
}

/** The values entered into a form, along with the form they were entered into. */
export type PluginFormState = {
  form: PluginForm | null;
  values: PluginFormValues;
};

/** Records a field's new values, starting afresh when they belong to a different form. */
export function pluginFormReducer(
  state: PluginFormState,
  change: { form: PluginForm; field: string; values: readonly string[] },
): PluginFormState {
  const values =
    state.form === change.form ? state.values : initialValuesOf(change.form);
  return {
    form: change.form,
    values: { ...values, [change.field]: change.values },
  };
}

function initialValuesOfControl(control: FormControl): readonly string[] {
  switch (control.kind) {
    case "text":
      return [control.value];
    case "choose-one":
    case "choose-many":
      return control.chosen;
    case "toggle":
      return [String(control.on)];
    case "note":
      return [];
  }
}
