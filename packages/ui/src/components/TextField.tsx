import clsx from "clsx";
import { type ComponentProps, useId } from "react";

/** A labelled single-line or multi-line text input. */
export function TextField({
  label,
  hint,
  multiline = false,
  className,
  ...rest
}: Omit<ComponentProps<"input">, "id"> & {
  label: string;
  hint?: string;
  multiline?: boolean;
}) {
  const id = useId();
  const inputClassName =
    "w-full rounded-md border border-line-strong bg-surface px-2.5 py-1.5 text-sm text-fg placeholder:text-fg-faint focus:border-accent focus:outline-2 focus:outline-accent/30 disabled:opacity-50";
  return (
    <div className={clsx("flex flex-col gap-1", className)}>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {multiline ? (
        <textarea
          id={id}
          rows={2}
          className={inputClassName}
          {...(rest as ComponentProps<"textarea">)}
        />
      ) : (
        <input id={id} className={inputClassName} {...rest} />
      )}
      {hint && <p className="text-xs text-fg-muted">{hint}</p>}
    </div>
  );
}
