import clsx from "clsx";
import type { ComponentProps } from "react";

const linkClasses =
  "inline rounded-sm text-accent-fg hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

/** A button styled as a link, for an action that belongs inside a sentence or a hint rather than beside it. */
export function LinkButton({
  className,
  type = "button",
  ...rest
}: ComponentProps<"button">) {
  return (
    <button type={type} className={clsx(linkClasses, className)} {...rest} />
  );
}

/** A link to another screen, styled as `LinkButton` is, for a way there that belongs inside a sentence or a hint. */
export function TextLink({
  className,
  ...rest
}: ComponentProps<"a"> & { href: string }) {
  return <a className={clsx(linkClasses, className)} {...rest} />;
}
