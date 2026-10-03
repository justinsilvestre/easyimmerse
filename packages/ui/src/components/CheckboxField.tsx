import type { ComponentProps } from "react";

/** A labelled checkbox, with an optional second line explaining the choice. */
export function CheckboxField({
  label,
  hint,
  ...rest
}: Omit<ComponentProps<"input">, "type"> & { label: string; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-2 text-sm has-disabled:cursor-not-allowed has-disabled:opacity-50">
      <input
        type="checkbox"
        className="mt-0.5 size-4 accent-accent"
        {...rest}
      />
      <span className="flex flex-col">
        <span>{label}</span>
        {hint && <span className="text-xs text-fg-muted">{hint}</span>}
      </span>
    </label>
  );
}
