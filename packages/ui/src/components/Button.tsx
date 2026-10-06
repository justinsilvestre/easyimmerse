import clsx from "clsx";
import type { ComponentProps } from "react";

type ButtonProps = ComponentProps<"button"> & {
  variant?: "primary" | "secondary" | "subtle" | "danger";
  size?: "sm" | "md";
};

/**
 * A button in one of the app's styles. Marked `aria-disabled`, it looks unavailable and reacts to no hover,
 * while keeping its focus, unlike `disabled`; its handlers must then ignore it.
 */
export function Button({
  variant = "secondary",
  size = "md",
  className,
  type = "button",
  ...rest
}: ButtonProps) {
  const isUnavailable =
    rest["aria-disabled"] === true || rest["aria-disabled"] === "true";
  return (
    <button
      type={type}
      className={clsx(
        "inline-flex items-center justify-center gap-1.5 rounded-md font-medium whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50",
        size === "md" && "px-3 py-1.5 text-sm",
        size === "sm" && "px-2 py-1 text-xs",
        variant === "primary" && "bg-accent text-on-accent",
        variant === "secondary" && "border border-line-strong bg-surface",
        variant === "subtle" && "text-fg-muted",
        variant === "danger" && "border border-danger-line text-danger-fg",
        !isUnavailable && hoverStyles[variant],
        className,
      )}
      {...rest}
    />
  );
}

const hoverStyles: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary: "hover:bg-accent-hover",
  secondary: "hover:bg-surface-muted",
  subtle: "hover:bg-surface-muted hover:text-fg",
  danger: "hover:bg-danger-soft",
};
