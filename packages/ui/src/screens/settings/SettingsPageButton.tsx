import { ChevronRight, ExternalLink } from "lucide-react";
import type { ReactNode } from "react";

/**
 * A row of the general settings that opens another settings page, with an icon, the page's name and what it holds.
 * An external row opens a page outside the app instead, and shows an external-link icon in place of the arrow.
 */
export function SettingsPageButton({
  icon,
  label,
  description,
  isExternal = false,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  description: string;
  isExternal?: boolean;
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
      {isExternal ? (
        <ExternalLink className="size-4 text-fg-muted" aria-hidden />
      ) : (
        <ChevronRight className="size-4 text-fg-muted" aria-hidden />
      )}
    </button>
  );
}
