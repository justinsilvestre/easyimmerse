import type { FlashcardSync } from "@easyimmerse/state";
import type { FlashcardFieldKey } from "@easyimmerse/types";
import { GraduationCap, Plug } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "../components/Badge.tsx";
import { FlashcardPreview } from "../flashcards/FlashcardPreview.tsx";
import type { FlashcardLanguages } from "../flashcards/flashcardFields.ts";
import { AnkiConnectChannel } from "./AnkiConnectChannel.tsx";
import { AnkiPackageChannel } from "./AnkiPackageChannel.tsx";

/**
 * Shows how the project's flashcards reach Anki: the Anki package, which can always be exported,
 * AnkiConnect, set up or turned on, and the review in easyImmerse, which is not available yet.
 * Beside them is the next card waiting to reach Anki.
 */
export function FlashcardSyncPanel({
  sync,
  includedFields,
  frontFields,
  languages,
  onExportPackage,
  onSetUpAnkiConnect,
  onTurnOffAnkiConnect,
  onSendToAnki,
  onCheckConnection,
  onStartReview,
}: {
  sync: FlashcardSync;
  includedFields: readonly FlashcardFieldKey[];
  frontFields: readonly FlashcardFieldKey[];
  languages: FlashcardLanguages;
  onExportPackage: () => void;
  onSetUpAnkiConnect: () => void;
  onTurnOffAnkiConnect: () => void;
  onSendToAnki: () => void;
  onCheckConnection: () => void;
  /** Called by the review option, which is marked as coming soon; it can explain. */
  onStartReview: () => void;
}) {
  const { ankiConnect, flashcardCount } = sync;
  return (
    <section
      aria-label="Flashcards"
      className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4"
    >
      <h2 className="font-semibold">Flashcards</h2>
      <div className="grid items-start gap-4 sm:grid-cols-[1fr_14rem]">
        <div className="flex flex-col divide-y divide-line">
          <AnkiPackageChannel
            sync={sync.package}
            flashcardCount={flashcardCount}
            isMainChannel={ankiConnect === null}
            onExportPackage={onExportPackage}
          />
          {ankiConnect === null ? (
            <Option
              icon={<Plug className="size-5" aria-hidden />}
              title="Set up AnkiConnect"
              description="Send new cards straight to Anki while it runs."
              onClick={onSetUpAnkiConnect}
            />
          ) : (
            <AnkiConnectChannel
              sync={ankiConnect}
              flashcardCount={flashcardCount}
              onSendToAnki={onSendToAnki}
              onCheckConnection={onCheckConnection}
              onSetUpAnkiConnect={onSetUpAnkiConnect}
              onTurnOff={onTurnOffAnkiConnect}
            />
          )}
          <Option
            icon={<GraduationCap className="size-5" aria-hidden />}
            title="Review in easyImmerse"
            description="Study the cards here, with spaced repetition."
            badge={<Badge>Coming soon</Badge>}
            onClick={onStartReview}
          />
        </div>
        {sync.nextCard ? (
          <FlashcardPreview
            content={sync.nextCard}
            includedFields={includedFields}
            frontFields={frontFields}
            languages={languages}
            compact
          />
        ) : (
          <p className="self-center text-center text-sm text-fg-faint">
            {ankiConnect === null
              ? "No flashcards waiting to be exported."
              : "No flashcards waiting to be sent."}
          </p>
        )}
      </div>
    </section>
  );
}

/** A way to reach Anki, or to review, that is not in use: one button with its title and description. */
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
