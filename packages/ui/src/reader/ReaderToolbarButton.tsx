import clsx from "clsx";
import type { ComponentProps } from "react";

/** A button for the reader toolbar, shaded while pressed or expanded. A compact button fits inside a segmented group. */
export function ReaderToolbarButton({
  isCompact = false,
  className,
  type = "button",
  ...rest
}: ComponentProps<"button"> & { isCompact?: boolean }) {
  return (
    <button
      type={type}
      className={clsx(
        "inline-flex items-center justify-center gap-1.5 rounded-md px-2 text-fg-soft",
        isCompact ? "h-7 min-w-7" : "h-8 min-w-8",
        "hover:bg-surface-muted disabled:opacity-35 disabled:hover:bg-transparent",
        "focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-1",
        "aria-expanded:bg-surface-strong aria-pressed:bg-fg aria-pressed:text-surface",
        className,
      )}
      {...rest}
    />
  );
}
