import clsx from "clsx";
import { type ReactNode, useId } from "react";

/**
 * A labelled row of mutually exclusive options, each taking an equal share of the width.
 * A plain row suits swatches: each option's label holds a span whose inner span is the swatch, which is ringed when chosen.
 */
export function ChoiceRow<Value extends string>({
  label,
  value,
  options,
  onChange,
  isPlain = false,
}: {
  label: string;
  value: Value;
  options: readonly { value: Value; label: ReactNode }[];
  onChange: (value: Value) => void;
  /** Draws the options without a frame, for options that bring their own, such as swatches. */
  isPlain?: boolean;
}) {
  const name = useId();
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1.5 text-sm text-fg-muted">{label}</legend>
      <div
        className={clsx(
          "flex",
          isPlain ? "justify-between" : "rounded-md bg-surface-muted p-0.5",
        )}
      >
        {options.map((option) => (
          <label
            key={option.value}
            className={clsx(
              "flex flex-1 cursor-pointer justify-center rounded text-sm has-focus-visible:outline-2 has-focus-visible:outline-accent",
              isPlain
                ? "p-1 text-fg-muted has-checked:text-accent-fg has-checked:[&>span>span]:ring-2 has-checked:[&>span>span]:ring-accent"
                : "px-2 py-1 text-fg-muted hover:text-fg has-checked:bg-surface has-checked:text-fg has-checked:shadow-sm",
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
      </div>
    </fieldset>
  );
}
