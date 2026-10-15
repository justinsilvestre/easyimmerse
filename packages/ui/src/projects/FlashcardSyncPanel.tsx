import type { AnkiConnectionStatus, FlashcardSync } from "@easyimmerse/state";
import type { FlashcardContent, FlashcardFieldKey } from "@easyimmerse/types";
import { Download, GraduationCap, Plug, Send } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "../components/Badge.tsx";
import { Button } from "../components/Button.tsx";
import { pluralize } from "../components/pluralize.ts";
import { FlashcardPreview } from "../flashcards/FlashcardPreview.tsx";
import type { FlashcardLanguages } from "../flashcards/flashcardFields.ts";

/** Where the project's flashcards last went: nowhere yet, the built-in review, an Anki package, or Anki itself. */
export type FlashcardSyncState =
  | FlashcardSync
  | { kind: "review"; dueCount: number; nextCard: FlashcardContent | null };

/** A place the project's flashcards can go, named after the state it leads to. */
type FlashcardSyncOption = Exclude<FlashcardSyncState["kind"], "notStarted">;

type Callbacks = {
  onExportPackage: () => void;
  onSetUpAnkiConnect: () => void;
  onStartReview: () => void;
  onSendToAnki: () => void;
  onCheckConnection: () => void;
  /** Lets the user choose another destination among the options shown before the first. */
  onChangeDestination: () => void;
};

/**
 * Shows where the project's flashcards go, with the next card to review or send, and the action to take.
 * Destinations listed in `comingSoon` are marked as such among the options; choosing one still calls its callback, which can explain.
 */
export function FlashcardSyncPanel({
  state,
  includedFields,
  frontFields,
  languages,
  comingSoon = [],
  ...callbacks
}: {
  state: FlashcardSyncState;
  includedFields: readonly FlashcardFieldKey[];
  frontFields: readonly FlashcardFieldKey[];
  languages: FlashcardLanguages;
  comingSoon?: readonly FlashcardSyncOption[];
} & Callbacks) {
  return (
    <section
      aria-label="Flashcards"
      className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">Flashcards</h2>
        {(state.kind === "ankiPackage" || state.kind === "ankiConnect") && (
          <Button
            variant="subtle"
            size="sm"
            onClick={callbacks.onChangeDestination}
          >
            Change destination
          </Button>
        )}
      </div>
      {state.kind === "notStarted" ? (
        <NotStarted comingSoon={comingSoon} {...callbacks} />
      ) : (
        <div className="grid items-start gap-4 sm:grid-cols-[1fr_14rem]">
          <Status state={state} {...callbacks} />
          {state.nextCard ? (
            <FlashcardPreview
              content={state.nextCard}
              includedFields={includedFields}
              frontFields={frontFields}
              languages={languages}
              compact
            />
          ) : (
            <p className="self-center text-center text-sm text-fg-faint">
              {emptyPreviews[state.kind]}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

/** What the preview's place says when no flashcard waits, by destination. */
const emptyPreviews = {
  review: "No flashcards due for review.",
  ankiPackage: "No flashcards waiting to be exported.",
  ankiConnect: "No flashcards waiting to be sent.",
} satisfies Record<FlashcardSyncOption, string>;

function NotStarted({
  comingSoon,
  ...callbacks
}: { comingSoon: readonly FlashcardSyncOption[] } & Callbacks) {
  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col">
        <Option
          icon={<GraduationCap className="size-5" aria-hidden />}
          title="Review in easyImmerse"
          description="Study the cards here, with spaced repetition."
          isComingSoon={comingSoon.includes("review")}
          onClick={callbacks.onStartReview}
        />
        <Option
          icon={<Download className="size-5" aria-hidden />}
          title="Export an Anki deck"
          description="Save a package to import into Anki."
          isComingSoon={comingSoon.includes("ankiPackage")}
          onClick={callbacks.onExportPackage}
        />
        <Option
          icon={<Plug className="size-5" aria-hidden />}
          title="Set up AnkiConnect"
          description="Send new cards straight to Anki while it runs."
          isComingSoon={comingSoon.includes("ankiConnect")}
          onClick={callbacks.onSetUpAnkiConnect}
        />
      </ul>
    </div>
  );
}

function Option({
  icon,
  title,
  description,
  isComingSoon,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  isComingSoon: boolean;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-accent"
      >
        <span className="text-fg-muted">{icon}</span>
        <span className="flex flex-1 flex-col">
          <span className="font-medium">{title}</span>
          <span className="text-xs text-fg-muted">{description}</span>
        </span>
        {isComingSoon && <Badge>Coming soon</Badge>}
      </button>
    </li>
  );
}

function Status({
  state,
  ...callbacks
}: { state: Exclude<FlashcardSyncState, { kind: "notStarted" }> } & Callbacks) {
  switch (state.kind) {
    case "review":
      return (
        <StatusBlock
          summary={
            state.dueCount === 0
              ? "Nothing due for review."
              : `${pluralize(state.dueCount, "card")} due for review.`
          }
          action={
            <Button variant="primary" onClick={callbacks.onStartReview}>
              <GraduationCap className="size-4" aria-hidden />
              Continue reviewing
            </Button>
          }
        />
      );
    case "ankiPackage":
      return (
        <StatusBlock
          summary={ankiPackageSummary(state)}
          action={
            <Button variant="primary" onClick={callbacks.onExportPackage}>
              <Download className="size-4" aria-hidden />
              Export an Anki deck
            </Button>
          }
        />
      );
    case "ankiConnect":
      return (
        <StatusBlock
          badge={connectionBadges[state.connection]}
          summary={ankiConnectSummary(state)}
          hint={connectionHints[state.connection]}
          action={
            <>
              <Button
                variant="primary"
                disabled={
                  (state.unsentCount === 0 &&
                    state.pendingDeletionCount === 0) ||
                  state.isSyncing
                }
                onClick={callbacks.onSendToAnki}
              >
                <Send className="size-4" aria-hidden />
                {state.isSyncing ? "Sending…" : "Send to Anki"}
              </Button>
              {isUnconnected(state.connection) && (
                <>
                  <Button onClick={callbacks.onCheckConnection}>
                    Check again
                  </Button>
                  <Button
                    variant="subtle"
                    onClick={callbacks.onSetUpAnkiConnect}
                  >
                    Setup help
                  </Button>
                </>
              )}
            </>
          }
        />
      );
  }
}

/** Counts the flashcards made since the last export. */
function ankiPackageSummary({
  flashcardCount,
  unexportedCount,
}: {
  flashcardCount: number;
  unexportedCount: number;
}) {
  if (unexportedCount > 0)
    return `${pluralize(unexportedCount, "new flashcard")} since the last export.`;
  return flashcardCount === 0
    ? "No flashcards yet."
    : "Every flashcard has been exported.";
}

/** Counts the flashcards waiting to be sent to Anki and the notes waiting to be deleted from it. */
function ankiConnectSummary({
  flashcardCount,
  unsentCount,
  pendingDeletionCount,
}: {
  flashcardCount: number;
  unsentCount: number;
  pendingDeletionCount: number;
}) {
  const notes = pluralize(pendingDeletionCount, "note");
  if (unsentCount === 0 && pendingDeletionCount > 0)
    return `${notes} waiting to be deleted from Anki.`;
  if (unsentCount === 0)
    return flashcardCount === 0
      ? "No flashcards yet."
      : "Every flashcard is in Anki.";
  const unsent = `${pluralize(unsentCount, "flashcard")} waiting to be sent`;
  return pendingDeletionCount === 0
    ? `${unsent}.`
    : `${unsent}, ${notes} to delete.`;
}

const connectionBadges = {
  checking: <Badge>Checking Anki…</Badge>,
  connected: <Badge tone="success">Anki connected</Badge>,
  unreachable: <Badge tone="danger">Anki unreachable</Badge>,
  denied: <Badge tone="danger">Anki refused easyImmerse</Badge>,
} satisfies Record<AnkiConnectionStatus, ReactNode>;

/**
 * Tells how to connect to Anki when the last check did not.
 * AnkiConnect asks again each time a page it refused checks, unless the user chose to ignore that page, which its config then lists.
 */
const connectionHints = {
  checking: undefined,
  connected: undefined,
  unreachable:
    "Start Anki with the AnkiConnect add-on installed, then check again.",
  denied:
    "Anki is running but did not allow easyImmerse to use AnkiConnect. Check again, and choose Yes when Anki asks. If Anki does not ask, choose Tools, then Add-ons in Anki, select AnkiConnect and choose Config, remove easyImmerse's address from ignoreOriginList, and check again.",
} satisfies Record<AnkiConnectionStatus, string | undefined>;

/** Tells whether the last check found that easyImmerse cannot use Anki, so that the user can check again or get help. */
function isUnconnected(connection: AnkiConnectionStatus) {
  return connection === "unreachable" || connection === "denied";
}

function StatusBlock({
  badge,
  summary,
  hint,
  action,
}: {
  badge?: ReactNode;
  summary: string;
  hint?: string;
  action: ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-2 text-sm">
      {badge}
      <p>{summary}</p>
      {hint && <p className="text-fg-muted">{hint}</p>}
      <div className="flex flex-wrap gap-2 pt-1">{action}</div>
    </div>
  );
}
