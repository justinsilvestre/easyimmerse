import type { FormField, FormOption } from "@easyimmerse/types";
import { CheckboxField } from "../components/CheckboxField.tsx";
import { SelectField } from "../components/SelectField.tsx";
import { TextField } from "../components/TextField.tsx";

/** One field of a plugin form, drawn as the control its kind calls for. */
export function PluginFormField({
  field,
  values,
  onChange,
}: {
  field: FormField;
  values: readonly string[];
  onChange: (values: readonly string[]) => void;
}) {
  const { label, control } = field;
  const hint = field.hint ?? undefined;
  switch (control.kind) {
    case "text":
      return (
        <TextField
          label={label}
          hint={hint}
          placeholder={control.placeholder ?? undefined}
          value={values[0] ?? ""}
          onChange={(event) => onChange([event.target.value])}
        />
      );
    case "choose-one":
      return (
        <SelectField
          label={label}
          hint={hint}
          options={selectOptionsOf(control.options, values.length === 0)}
          value={values[0] ?? ""}
          onChange={(event) =>
            onChange(event.target.value === "" ? [] : [event.target.value])
          }
        />
      );
    case "choose-many":
      return (
        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1 text-sm font-medium">{label}</legend>
          {control.options.map((option) => (
            <CheckboxField
              key={option.id}
              label={option.label}
              hint={option.hint ?? undefined}
              checked={values.includes(option.id)}
              onChange={(event) =>
                onChange(
                  event.target.checked
                    ? [...values, option.id]
                    : values.filter((id) => id !== option.id),
                )
              }
            />
          ))}
          {hint && <p className="text-xs text-fg-muted">{hint}</p>}
        </fieldset>
      );
    case "toggle":
      return (
        <CheckboxField
          label={label}
          hint={hint}
          checked={values[0] === "true"}
          onChange={(event) => onChange([String(event.target.checked)])}
        />
      );
    case "note":
      return (
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium">{label}</p>
          <p className="text-sm">{control.text}</p>
          {hint && <p className="text-xs text-fg-muted">{hint}</p>}
        </div>
      );
  }
}

/** The options of a drop-down list, led by an empty one when nothing is chosen yet. */
function selectOptionsOf(options: readonly FormOption[], isUnchosen: boolean) {
  const listed = options.map((option) => ({
    value: option.id,
    label: option.hint ? `${option.label} (${option.hint})` : option.label,
  }));
  return isUnchosen ? [{ value: "", label: "" }, ...listed] : listed;
}
