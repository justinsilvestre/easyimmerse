import clsx from "clsx";
import type { ComponentProps } from "react";

/**
 * A square button that shows only an icon. The label is read by assistive technology and shown as a tooltip.
 * Pass `pressed` to make it a toggle, which then always reports whether it is on.
 */
export function IconButton({
  label,
  pressed,
  className,
  type = "button",
  children,
  ...rest
}: ComponentProps<"button"> & { label: string; pressed?: boolean }) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      className={clsx(
        "inline-flex size-8 items-center justify-center rounded-md text-fg-muted hover:bg-surface-muted hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40",
        pressed && "bg-accent-soft text-accent-fg",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
