import clsx from "clsx";
import { useId } from "react";

/** The classes that lay out a narrow screen's grid in as many columns as it has. */
const narrowColumnClasses = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
};

/**
 * A row of mutually exclusive options, such as presets, where every option stays visible.
 * On a narrow screen the options fill the width, as one row of up to three, or else as a grid of separate buttons with no row left half empty.
 * Otherwise the row is only as wide as its options, whatever its parent's layout.
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
  const isWrapped = options.length > 3;
  return (
    <fieldset
      className={clsx(
        "grid sm:inline-flex sm:w-fit sm:gap-0 sm:rounded-md sm:border sm:border-line-strong sm:bg-surface sm:p-0.5",
        narrowColumnClasses[narrowColumnCount(options.length)],
        isWrapped
          ? "gap-2"
          : "rounded-md border border-line-strong bg-surface p-0.5",
      )}
    >
      <legend className="sr-only">{label}</legend>
      {options.map((option) => (
        <label
          key={option.value}
          className={clsx(
            "cursor-pointer text-center text-fg-muted hover:bg-surface-muted hover:text-fg has-checked:bg-accent has-checked:text-on-accent has-focus-visible:outline-2 has-focus-visible:outline-accent",
            size === "md" ? "px-3 py-1 text-sm" : "px-2 py-0.5 text-xs",
            isWrapped
              ? "rounded-md border border-line-strong bg-surface has-checked:border-accent sm:rounded sm:border-0"
              : "rounded",
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

/** Returns how many columns a narrow screen gives the options: all of them up to three, and otherwise two or three, whichever fills the last row. */
function narrowColumnCount(optionCount: number): 1 | 2 | 3 {
  if (optionCount <= 1) return 1;
  if (optionCount <= 3) return optionCount as 2 | 3;
  return optionCount % 2 === 0 ? 2 : 3;
}
