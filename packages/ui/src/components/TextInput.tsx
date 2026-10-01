import { useId } from "react";
import { FieldHint } from "./FieldHint.tsx";
import { FieldLabel } from "./FieldLabel.tsx";

export function TextInput({
  label,
  value,
  onChange,
  hint,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  placeholder?: string;
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <input
        id={id}
        type="text"
        value={value}
        placeholder={placeholder}
        aria-describedby={hint ? hintId : undefined}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border border-line-strong bg-surface px-3 py-1.5 text-sm text-fg placeholder:text-fg-faint focus:border-accent focus:outline-hidden focus:ring-2 focus:ring-accent/20"
      />
      {hint && <FieldHint id={hintId}>{hint}</FieldHint>}
    </div>
  );
}
