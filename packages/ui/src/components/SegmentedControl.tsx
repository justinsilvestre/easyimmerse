import clsx from "clsx";
import { useId } from "react";

/**
 * A row of mutually exclusive options, such as presets, where every option stays visible.
 * On a narrow screen the options fill two columns across the width; otherwise the row is only as wide as its options, whatever its parent's layout.
 */
export function SegmentedControl<Value extends string>({
  label,
  options,
  value,
  size = "md",
  onChange,
}: {
  label: string;
  options: readonly { value: Value; label: string }[];
  value: Value;
  size?: "sm" | "md";
  onChange: (value: Value) => void;
}) {
  const name = useId();
  return (
    <fieldset className="grid grid-cols-2 rounded-md border border-line-strong bg-surface p-0.5 sm:inline-flex sm:w-fit">
      <legend className="sr-only">{label}</legend>
      {options.map((option) => (
        <label
          key={option.value}
          className={clsx(
            "cursor-pointer rounded text-center text-fg-muted hover:bg-surface-muted hover:text-fg has-checked:bg-accent has-checked:text-on-accent has-focus-visible:outline-2 has-focus-visible:outline-accent",
            size === "md" ? "px-3 py-1 text-sm" : "px-2 py-0.5 text-xs",
          )}
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={option.value === value}
            onChange={() => onChange(option.value)}
            className="sr-only"
          />
          {option.label}
        </label>
      ))}
    </fieldset>
  );
}
