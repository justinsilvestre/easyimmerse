import type { FormInput, PluginForm } from "@easyimmerse/types";
import { useReducer } from "react";
import {
  initialValuesOf,
  inputOf,
  type PluginFormValues,
  pluginFormReducer,
} from "./pluginFormValues.ts";

/**
 * What the user has entered into `form`, kept until a different form arrives.
 * `input` gives what to send to the plugin for the values entered so far.
 */
export function usePluginFormValues(form: PluginForm | null): {
  values: PluginFormValues;
  change: (field: string, values: readonly string[]) => void;
  input: () => FormInput[];
} {
  const [state, dispatch] = useReducer(pluginFormReducer, form, (initial) => ({
    form: initial,
    values: initialValuesOf(initial),
  }));
  const values = state.form === form ? state.values : initialValuesOf(form);
  return {
    values,
    change: (field, fieldValues) =>
      form && dispatch({ form, field, values: fieldValues }),
    input: () => (form ? inputOf(form, values) : []),
  };
}
