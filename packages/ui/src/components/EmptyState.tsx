import type { ReactNode } from "react";

/** Fills a space that has no content yet with an explanation and the actions that would add some. */
export function EmptyState({
  icon,
  title,
  description,
  actions,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-line-strong px-6 py-10 text-center">
      {icon && <div className="text-fg-faint">{icon}</div>}
      <p className="font-medium">{title}</p>
      {description && (
        <p className="max-w-sm text-sm text-fg-muted">{description}</p>
      )}
      {actions && (
        <div className="mt-1 flex flex-wrap justify-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}
