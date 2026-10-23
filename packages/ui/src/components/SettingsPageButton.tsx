import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

/** A row of the general settings that opens another settings page, with an icon, the page's name and what it holds. */
export function SettingsPageButton({
  icon,
  label,
  description,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 rounded-lg border border-line bg-surface px-4 py-3 text-left hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-accent"
    >
      {icon}
      <span className="flex flex-1 flex-col">
        <span className="font-medium">{label}</span>
        <span className="text-sm text-fg-muted">{description}</span>
      </span>
      <ChevronRight className="size-4 text-fg-muted" aria-hidden />
    </button>
  );
}
