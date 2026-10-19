import {
  type FlashcardSync,
  type ProjectFlashcardsMode,
  projectFlashcardsModeOf,
} from "@easyimmerse/state";
import type { FlashcardFieldKey } from "@easyimmerse/types";
import { Download, GraduationCap, Plug } from "lucide-react";
import type { ReactNode } from "react";
import { MenuButton } from "../components/MenuButton.tsx";
import type { MenuItem } from "../components/MenuItemButton.tsx";
import { FlashcardPreview } from "../flashcards/FlashcardPreview.tsx";
import type { FlashcardLanguages } from "../flashcards/flashcardFields.ts";
import { AnkiConnectChannel } from "./AnkiConnectChannel.tsx";
import { AnkiPackageChannel } from "./AnkiPackageChannel.tsx";
import { DeletedInAnki } from "./DeletedInAnki.tsx";
import { FlashcardsColumns } from "./FlashcardsColumns.tsx";
import { QueueSummary } from "./QueueSummary.tsx";
import { ReviewChannel } from "./ReviewChannel.tsx";

/**
 * Shows the ways to use the project's flashcards: the review in easyImmerse, AnkiConnect, and the Anki deck package.
 * Until one is in use, all three are offered alike. Once AnkiConnect is on or has sent flashcards, the review has progress,
 * or flashcards have been exported in a package, that way fills the panel and a "More options" menu holds the others.
 * Beside it is the next card: the first in the Anki updates queue, which both the package and AnkiConnect count,
 * or the front of the next card to review, with the main button of the way in use under it.
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
  onStartReview: () => void;
}) {
  const { flashcardCount } = sync;
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
  const reviewPreview = sync.review.nextCard && (
    <FlashcardPreview
      content={sync.review.nextCard}
      includedFields={includedFields}
      frontFields={frontFields}
      languages={languages}
      compact
      frontOnly
    />
  );
  const exportItem: MenuItem = {
    label: "Export an Anki deck package",
    icon: <Download className="size-4" aria-hidden />,
    onSelect: onExportPackage,
  };
  const setUpAnkiConnectItem: MenuItem = {
    label: "Set up AnkiConnect",
    icon: <Plug className="size-4" aria-hidden />,
    onSelect: onSetUpAnkiConnect,
  };
  const reviewItem: MenuItem = {
    label: "Review in easyImmerse",
    icon: <GraduationCap className="size-4" aria-hidden />,
    onSelect: onStartReview,
  };
  const moreOptions: Record<ProjectFlashcardsMode, readonly MenuItem[]> = {
    fresh: [],
    ankiConnect: [exportItem, reviewItem],
    review: [exportItem, setUpAnkiConnectItem],
    package: [setUpAnkiConnectItem, reviewItem],
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
              icon={<GraduationCap className="size-5" aria-hidden />}
              title="Review in easyImmerse"
              description="Study the flashcards here, with spaced repetition."
              onClick={onStartReview}
            />
            <Option
              icon={<Plug className="size-5" aria-hidden />}
              title="Set up AnkiConnect"
              description="Send flashcards to Anki as you make them."
              onClick={onSetUpAnkiConnect}
            />
            <Option
              icon={<Download className="size-5" aria-hidden />}
              title="Export an Anki deck package"
              description="Save a file to import into Anki."
              onClick={onExportPackage}
            />
          </div>
        </FlashcardsColumns>
      )}
      {mode === "review" && (
        <ReviewChannel
          review={sync.review}
          preview={reviewPreview}
          onStartReview={onStartReview}
        />
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
      {mode === "ankiConnect" && (
        <AnkiConnectChannel
          sync={sync.ankiConnect}
          queue={sync.queue}
          flashcardCount={flashcardCount}
          preview={preview}
          onCheckConnection={onCheckConnection}
          onTryAgain={onTryAnkiSyncAgain}
          onSetUpAnkiConnect={onSetUpAnkiConnect}
          onTurnOff={onTurnOffAnkiConnect}
        >
          {sync.package.deletions.length > 0 && (
            <DeletedInAnki
              deletions={sync.package.deletions}
              ankiSearch={sync.package.ankiSearch}
              onCopyAnkiSearch={onCopyAnkiSearch}
              onMarkDone={onMarkDeletionsDone}
            />
          )}
        </AnkiConnectChannel>
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
  review: {
    title: "Reviewing flashcards in easyImmerse",
    icon: <GraduationCap className="size-5 text-fg-muted" aria-hidden />,
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
  onClick,
}: {
  icon: ReactNode;
  title: string;
  description: string;
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
      </button>
    </div>
  );
}
