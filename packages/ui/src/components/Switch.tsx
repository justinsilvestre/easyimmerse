import clsx from "clsx";

/**
 * A labelled on-off switch. `onChange` receives the state the user asked for.
 * `accessibleLabel` names it for assistive technology when the visible `label` is too short to stand alone.
 */
export function Switch({
  label,
  accessibleLabel,
  checked,
  disabled = false,
  onChange,
}: {
  label: string;
  accessibleLabel?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={accessibleLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2 rounded-md text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span
        aria-hidden
        className={clsx(
          "flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors",
          checked ? "bg-accent" : "bg-line-strong",
        )}
      >
        <span
          className={clsx(
            "size-4 rounded-full bg-on-accent shadow-sm transition-transform",
            checked && "translate-x-4",
          )}
        />
      </span>
      {label}
    </button>
  );
}
