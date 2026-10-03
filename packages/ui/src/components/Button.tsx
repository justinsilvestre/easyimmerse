import clsx from "clsx";
import type { ComponentProps } from "react";

type ButtonProps = ComponentProps<"button"> & {
  variant?: "primary" | "secondary" | "subtle";
};

export function Button({
  variant = "secondary",
  className,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={clsx(
        "rounded px-3 py-1 text-sm disabled:opacity-50",
        variant === "primary" &&
          "bg-accent text-on-accent hover:bg-accent-hover",
        variant === "secondary" &&
          "border border-line-strong hover:bg-surface-muted",
        variant === "subtle" && "text-fg-muted underline hover:text-fg",
        className,
      )}
      {...rest}
    />
  );
}
