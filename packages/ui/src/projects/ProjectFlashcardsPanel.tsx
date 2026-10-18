import {
  type FlashcardSync,
  type ProjectFlashcardsMode,
  projectFlashcardsModeOf,
} from "@easyimmerse/state";
import type { FlashcardFieldKey } from "@easyimmerse/types";
import { Download, GraduationCap, Plug } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "../components/Badge.tsx";
import { MenuButton } from "../components/MenuButton.tsx";
import type { MenuItem } from "../components/MenuItemButton.tsx";
import { FlashcardPreview } from "../flashcards/FlashcardPreview.tsx";
import type { FlashcardLanguages } from "../flashcards/flashcardFields.ts";
import { AnkiConnectChannel } from "./AnkiConnectChannel.tsx";
import { AnkiPackageChannel } from "./AnkiPackageChannel.tsx";
import { FlashcardsColumns } from "./FlashcardsColumns.tsx";
import { QueueSummary } from "./QueueSummary.tsx";

/**
 * Shows the ways to use the project's flashcards: the Anki deck package, AnkiConnect, and the review in easyImmerse, which is not available yet.
 * Until one is in use, all three are offered alike. Once AnkiConnect is on, or flashcards have reached Anki through a package,
 * that way fills the panel and a "More options" menu holds the others.
 * On the left is the next card waiting to reach Anki, the first in the Anki updates queue that both the package and AnkiConnect count,
 * with the main button of the way in use under it.
 * While the project has no flashcards, that column is left out and the way in use takes the whole width.
 */
export function ProjectFlashcardsPanel({
  sync,
  includedFields,
  frontFields,
  languages,
  onExportPackage,
  onSetUpAnkiConnect,
  onTurnOffAnkiConnect,
  onCheckConnection,
  onTryAnkiSyncAgain,
  onCopyAnkiSearch,
  onMarkDeletionsDone,
  onStartReview,
}: {
  sync: FlashcardSync;
  includedFields: readonly FlashcardFieldKey[];
  frontFields: readonly FlashcardFieldKey[];
  languages: FlashcardLanguages;
  onExportPackage: () => void;
  onSetUpAnkiConnect: () => void;
  onTurnOffAnkiConnect: () => void;
  onCheckConnection: () => void;
  /** Sends to Anki again what a failed AnkiConnect sync left waiting. */
  onTryAnkiSyncAgain: () => void;
  onCopyAnkiSearch: () => void;
  onMarkDeletionsDone: () => void;
  /** Called by the review option, which is marked as coming soon; it can explain. */
  onStartReview: () => void;
}) {
  const { ankiConnect, flashcardCount } = sync;
  const mode = projectFlashcardsModeOf(sync);
  const hasFlashcards = flashcardCount > 0;
  const preview = sync.nextCard && (
    <FlashcardPreview
      content={sync.nextCard}
      includedFields={includedFields}
      frontFields={frontFields}
      languages={languages}
      compact
    />
  );
  const reviewItem: MenuItem = {
    label: "Review in easyImmerse (coming soon)",
    icon: <GraduationCap className="size-4" aria-hidden />,
    onSelect: onStartReview,
  };
  const moreOptions: Record<ProjectFlashcardsMode, readonly MenuItem[]> = {
    fresh: [],
    ankiConnect: [
      {
        label: "Export an Anki deck package",
        icon: <Download className="size-4" aria-hidden />,
        onSelect: onExportPackage,
      },
      reviewItem,
    ],
    package: [
      {
        label: "Set up AnkiConnect",
        icon: <Plug className="size-4" aria-hidden />,
        onSelect: onSetUpAnkiConnect,
      },
      reviewItem,
    ],
  };
  return (
    <section
      aria-label="Flashcards"
      className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-semibold">
          {headings[mode].icon}
          {headings[mode].title}
        </h2>
        {moreOptions[mode].length > 0 && (
          <MenuButton label="More options" items={moreOptions[mode]} />
        )}
      </div>
      {mode === "fresh" && (
        <FlashcardsColumns
          queue={
            hasFlashcards ? (
              <QueueSummary summary="Preview" preview={preview} />
            ) : null
          }
          action={null}
        >
          <div className="flex w-full flex-col divide-y divide-line">
            <Option
              icon={<Download className="size-5" aria-hidden />}
              title="Export an Anki deck package"
              description="Save a file to import into Anki."
              onClick={onExportPackage}
            />
            <Option
              icon={<Plug className="size-5" aria-hidden />}
              title="Set up AnkiConnect"
              description="Send flashcards to Anki as you make them."
              onClick={onSetUpAnkiConnect}
            />
            <Option
              icon={<GraduationCap className="size-5" aria-hidden />}
              title="Review in easyImmerse"
              description="Study the flashcards here, with spaced repetition."
              badge={<Badge>Coming soon</Badge>}
              onClick={onStartReview}
            />
          </div>
        </FlashcardsColumns>
      )}
      {mode === "package" && (
        <AnkiPackageChannel
          queue={sync.queue}
          sync={sync.package}
          flashcardCount={flashcardCount}
          preview={preview}
          onExportPackage={onExportPackage}
          onCopyAnkiSearch={onCopyAnkiSearch}
          onMarkDeletionsDone={onMarkDeletionsDone}
        />
      )}
      {ankiConnect !== null && (
        <AnkiConnectChannel
          sync={ankiConnect}
          queue={sync.queue}
          flashcardCount={flashcardCount}
          preview={preview}
          onCheckConnection={onCheckConnection}
          onTryAgain={onTryAnkiSyncAgain}
          onSetUpAnkiConnect={onSetUpAnkiConnect}
          onTurnOff={onTurnOffAnkiConnect}
        />
      )}
    </section>
  );
}

const headings: Record<
  ProjectFlashcardsMode,
  { title: string; icon: ReactNode }
> = {
  fresh: { title: "Flashcards", icon: null },
  package: {
    title: "Export flashcards in an Anki deck package",
    icon: <Download className="size-5 text-fg-muted" aria-hidden />,
  },
  ankiConnect: {
    title: "Making flashcards with AnkiConnect",
    icon: <Plug className="size-5 text-fg-muted" aria-hidden />,
  },
};

/** A way to use the flashcards that is not in use yet: one button with its title and description. */
function Option({
  icon,
  title,
  description,
  badge,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  badge?: ReactNode;
  onClick: () => void;
}) {
  return (
    <div className="py-2">
      <button
        type="button"
        onClick={onClick}
        className="-mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-md px-2 py-2 text-left text-sm hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-accent"
      >
        <span className="text-fg-muted">{icon}</span>
        <span className="flex flex-1 flex-col">
          <span className="font-medium">{title}</span>
          <span className="text-xs text-fg-muted">{description}</span>
        </span>
        {badge}
      </button>
    </div>
  );
}
