import { useId } from "react";

/** A labelled file picker, read through its form by `name`. */
export function FileField({
  label,
  name,
  accept,
  hint,
  required = false,
}: {
  label: string;
  name: string;
  accept?: string;
  hint?: string;
  required?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type="file"
        accept={accept}
        required={required}
        className="text-sm text-fg-muted file:mr-3 file:rounded-md file:border file:border-line-strong file:bg-surface file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-fg hover:file:bg-surface-muted"
      />
      {hint && <p className="text-xs text-fg-muted">{hint}</p>}
    </div>
  );
}
