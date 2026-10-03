import clsx from "clsx";
import { type ComponentProps, useId } from "react";

/** A labelled drop-down list. */
export function SelectField({
  label,
  options,
  hint,
  className,
  ...rest
}: Omit<ComponentProps<"select">, "id"> & {
  label: string;
  options: readonly { value: string; label: string }[];
  hint?: string;
}) {
  const id = useId();
  return (
    <div className={clsx("flex flex-col gap-1", className)}>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <select
        id={id}
        className="w-full rounded-md border border-line-strong bg-surface px-2 py-1.5 text-sm text-fg focus:border-accent focus:outline-2 focus:outline-accent/30 disabled:opacity-50"
        {...rest}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {hint && <p className="text-xs text-fg-muted">{hint}</p>}
    </div>
  );
}
