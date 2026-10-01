import clsx from "clsx";
import type { HTMLAttributes } from "react";

type CardProps = HTMLAttributes<HTMLElement> & {
  as?: "div" | "li" | "section";
  /** Highlights the card on hover, for cards that a `CardTitleButton` makes clickable. */
  interactive?: boolean;
};

/** A white panel with a subtle border. */
export function Card({
  as: Tag = "div",
  interactive = false,
  className,
  ...rest
}: CardProps) {
  return (
    <Tag
      className={clsx(
        "rounded-lg border border-gray-200 bg-white",
        interactive &&
          "relative transition-colors hover:border-gray-300 hover:bg-gray-50",
        className,
      )}
      {...rest}
    />
  );
}
