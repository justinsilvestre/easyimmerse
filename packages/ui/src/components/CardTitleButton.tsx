import clsx from "clsx";
import type { ComponentProps } from "react";

/**
 * A button holding a card's title whose click area covers the whole interactive `Card` around it.
 * Other controls in the card stay clickable when they are positioned above it, for example with `relative z-10`.
 */
export function CardTitleButton({
  className,
  type = "button",
  ...rest
}: ComponentProps<"button">) {
  return (
    <button
      type={type}
      className={clsx(
        "min-w-0 text-left font-medium text-gray-900 after:absolute after:inset-0 after:rounded-lg focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-blue-600",
        className,
      )}
      {...rest}
    />
  );
}
