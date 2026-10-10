import type { ReaderPanel } from "@easyimmerse/state";
import clsx from "clsx";
import { ALargeSmall, ArrowLeft, BookA, List, Search } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "../components/Button.tsx";
import { IconButton } from "../components/IconButton.tsx";

/**
 * The bar over the top of the page, which fades away while the reader reads.
 * While hidden, it lets clicks through to the text but stays in the tab order, so that a keyboard can still reach it.
 */
export function ReaderToolbar({
  title,
  projectName,
  chapterTitle,
  isVisible,
  panel,
  hasContents,
  headerContent,
  onBack,
  onLookup,
  onTogglePanel,
  onReveal,
}: {
  title: string;
  /** The name of the project the book belongs to, which the way back is named after. */
  projectName: string;
  chapterTitle: string | null;
  isVisible: boolean;
  panel: ReaderPanel | null;
  /** Whether the book has more than one chapter to list. */
  hasContents: boolean;
  headerContent?: ReactNode;
  onBack: () => void;
  onLookup: () => void;
  onTogglePanel: (panel: ReaderPanel) => void;
  /** Called when focus moves into the bar, so that a hidden bar can show itself again. */
  onReveal: () => void;
}) {
  return (
    // The focus listener only shows the bar again; the controls inside it are the interactive elements.
    // biome-ignore lint/a11y/noStaticElementInteractions: see above
    <header
      className={clsx(
        "absolute inset-x-0 top-0 z-20 pt-[env(safe-area-inset-top)] border-b border-line bg-surface/90 backdrop-blur transition-[opacity,translate] duration-300",
        !isVisible && "pointer-events-none -translate-y-2 opacity-0",
      )}
      onFocus={onReveal}
    >
      <div className="flex h-12 items-center gap-1 px-2">
        <Button
          variant="subtle"
          aria-label={`Back to ${projectName}`}
          className="min-w-0 shrink"
          onClick={onBack}
        >
          <ArrowLeft className="size-4 shrink-0" aria-hidden />
          <span className="hidden truncate sm:inline">{projectName}</span>
        </Button>
        {hasContents && (
          <IconButton
            label="Contents"
            pressed={panel === "contents"}
            onClick={() => onTogglePanel("contents")}
          >
            <List className="size-4" />
          </IconButton>
        )}
        <div className="flex min-w-0 flex-1 flex-col items-center px-2 text-center leading-tight">
          <h1 className="max-w-full truncate text-sm font-medium">{title}</h1>
          {chapterTitle && (
            <p className="max-w-full truncate text-xs text-fg-muted">
              {chapterTitle}
            </p>
          )}
        </div>
        <IconButton label="Look up a word (L)" onClick={onLookup}>
          <BookA className="size-4" />
        </IconButton>
        <IconButton
          label="Search the book"
          pressed={panel === "search"}
          onClick={() => onTogglePanel("search")}
        >
          <Search className="size-4" />
        </IconButton>
        <IconButton
          label="Appearance"
          pressed={panel === "appearance"}
          onClick={() => onTogglePanel("appearance")}
        >
          <ALargeSmall className="size-4" />
        </IconButton>
      </div>
      {headerContent && (
        <div className="border-t border-line px-3 py-2">{headerContent}</div>
      )}
    </header>
  );
}
