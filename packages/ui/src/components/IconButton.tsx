import clsx from "clsx";
import type { ComponentProps } from "react";

/** A square button that shows only an icon. The label is read by assistive technology and shown as a tooltip. */
export function IconButton({
  label,
  active = false,
  className,
  type = "button",
  children,
  ...rest
}: ComponentProps<"button"> & { label: string; active?: boolean }) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      aria-pressed={active || undefined}
      className={clsx(
        "inline-flex size-8 items-center justify-center rounded-md text-fg-muted hover:bg-surface-muted hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40",
        active && "bg-accent-soft text-accent-fg",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
