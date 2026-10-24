import clsx from "clsx";
import type { ComponentProps } from "react";

/** A button styled as a link, for an action that belongs inside a sentence or a hint rather than beside it. */
export function LinkButton({
  className,
  type = "button",
  ...rest
}: ComponentProps<"button">) {
  return (
    <button
      type={type}
      className={clsx(
        "inline rounded-sm text-accent-fg hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        className,
      )}
      {...rest}
    />
  );
}
