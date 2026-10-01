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
        "rounded-md px-3 py-1.5 text-sm disabled:opacity-50",
        variant === "primary" && "bg-blue-600 text-white hover:bg-blue-700",
        variant === "secondary" && "border border-gray-400 hover:bg-gray-100",
        variant === "subtle" && "text-gray-600 underline hover:text-gray-900",
        className,
      )}
      {...rest}
    />
  );
}
