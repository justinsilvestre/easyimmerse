import { ChevronRight, ExternalLink } from "lucide-react";
import type { ReactNode } from "react";

const rowClasses =
  "flex items-center gap-3 rounded-lg border border-line bg-surface px-4 py-3 text-left hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-accent";

/**
 * A row of the general settings, with an icon, a page's name and what it holds.
 * Given `href`, it links to another settings page. Given `onClick`, it opens a page outside the app, and shows an external-link icon in place of the arrow.
 */
export function SettingsPageButton({
  icon,
  label,
  description,
  ...target
}: {
  icon: ReactNode;
  label: string;
  description: string;
} & ({ href: string } | { onClick: () => void })) {
  const content = (
    <>
      {icon}
      <span className="flex flex-1 flex-col">
        <span className="font-medium">{label}</span>
        <span className="text-sm text-fg-muted">{description}</span>
      </span>
      {"href" in target ? (
        <ChevronRight className="size-4 text-fg-muted" aria-hidden />
      ) : (
        <ExternalLink className="size-4 text-fg-muted" aria-hidden />
      )}
    </>
  );
  return "href" in target ? (
    <a href={target.href} className={rowClasses}>
      {content}
    </a>
  ) : (
    <button type="button" onClick={target.onClick} className={rowClasses}>
      {content}
    </button>
  );
}
