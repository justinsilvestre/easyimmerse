import clsx from "clsx";
import type { HTMLAttributes } from "react";

type CardProps = HTMLAttributes<HTMLElement> & {
  as?: "div" | "li" | "section";
  /** Highlights the card on hover, for cards that a `CardTitleButton` makes clickable. */
  interactive?: boolean;
};

/** A panel with a subtle border. */
export function Card({
  as: Tag = "div",
  interactive = false,
  className,
  ...rest
}: CardProps) {
  return (
    <Tag
      className={clsx(
        "rounded-lg border border-line bg-surface",
        interactive &&
          "relative transition-colors hover:border-line-strong hover:bg-surface-muted/50",
        className,
      )}
      {...rest}
    />
  );
}
