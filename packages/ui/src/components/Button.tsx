import clsx from "clsx";
import type { ComponentProps } from "react";

type ButtonProps = ComponentProps<"button"> & {
  variant?: "primary" | "secondary" | "subtle" | "danger";
  size?: "sm" | "md";
};

export function Button({
  variant = "secondary",
  size = "md",
  className,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={clsx(
        "inline-flex items-center justify-center gap-1.5 rounded-md font-medium whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50",
        size === "md" && "px-3 py-1.5 text-sm",
        size === "sm" && "px-2 py-1 text-xs",
        variant === "primary" &&
          "bg-accent text-on-accent hover:bg-accent-hover",
        variant === "secondary" &&
          "border border-line-strong bg-surface hover:bg-surface-muted",
        variant === "subtle" &&
          "text-fg-muted hover:bg-surface-muted hover:text-fg",
        variant === "danger" &&
          "border border-danger-line text-danger-fg hover:bg-danger-soft",
        className,
      )}
      {...rest}
    />
  );
}
