import clsx from "clsx";
import type { ReactNode } from "react";

/** A small label that marks a status or a category. `title` is shown as a tooltip. */
export function Badge({
  tone = "neutral",
  title,
  children,
}: {
  tone?: "neutral" | "accent" | "success" | "warning" | "danger" | "info";
  title?: string;
  children: ReactNode;
}) {
  return (
    <span
      title={title}
      className={clsx(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        tone === "neutral" && "bg-surface-muted text-fg-muted",
        tone === "accent" && "bg-accent-soft text-accent-fg",
        tone === "success" && "bg-success-soft text-success-fg",
        tone === "warning" && "bg-warning-soft text-warning-fg",
        tone === "danger" && "bg-danger-soft text-danger-fg",
        tone === "info" && "bg-info-soft text-info-fg",
      )}
    >
      {children}
    </span>
  );
}
