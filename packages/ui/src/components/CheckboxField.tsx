import { useId } from "react";
import { FieldHint } from "./FieldHint.tsx";

export function CheckboxField({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  hint?: string;
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  return (
    <div className="flex items-start gap-3">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        aria-describedby={hint ? hintId : undefined}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 size-4 shrink-0 accent-accent"
      />
      <div className="flex flex-col gap-0.5">
        <label htmlFor={id} className="text-sm text-fg-soft">
          {label}
        </label>
        {hint && <FieldHint id={hintId}>{hint}</FieldHint>}
      </div>
    </div>
  );
}
