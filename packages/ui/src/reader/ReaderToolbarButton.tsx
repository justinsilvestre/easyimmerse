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
        "inline-flex items-center justify-center gap-1.5 rounded-md px-2 text-stone-700",
        isCompact ? "h-7 min-w-7" : "h-8 min-w-8",
        "hover:bg-stone-100 disabled:opacity-35 disabled:hover:bg-transparent",
        "focus-visible:outline-2 focus-visible:outline-blue-600 focus-visible:outline-offset-1",
        "aria-expanded:bg-stone-200 aria-pressed:bg-stone-800 aria-pressed:text-white",
        className,
      )}
      {...rest}
    />
  );
}
