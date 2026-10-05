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
  | { kind: "notStarted" }
  | { kind: "review"; dueCount: number; nextCard: FlashcardContent | null }
  | {
      kind: "ankiPackage";
      unexportedCount: number;
      nextCard: FlashcardContent | null;
    }
  | {
      kind: "ankiConnect";
      connection: "connected" | "unreachable";
      unsentCount: number;
      nextCard: FlashcardContent | null;
    };

type Callbacks = {
  onExportPackage: () => void;
  onSetUpAnkiConnect: () => void;
  onStartReview: () => void;
  onSendToAnki: () => void;
};

/** Shows where the project's flashcards go, with the next card to review or send, and the action to take. */
export function FlashcardSyncPanel({
  state,
  includedFields,
  languages,
  ...callbacks
}: {
  state: FlashcardSyncState;
  includedFields: readonly FlashcardFieldKey[];
  languages: FlashcardLanguages;
} & Callbacks) {
  return (
    <section
      aria-label="Flashcards"
      className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4"
    >
      <h2 className="font-semibold">Flashcards</h2>
      {state.kind === "notStarted" ? (
        <NotStarted {...callbacks} />
      ) : (
        <div className="grid items-start gap-4 sm:grid-cols-[1fr_14rem]">
          <Status state={state} {...callbacks} />
          {state.nextCard ? (
            <FlashcardPreview
              content={state.nextCard}
              includedFields={includedFields}
              languages={languages}
              compact
            />
          ) : (
            <p className="self-center text-center text-sm text-fg-faint">
              No flashcards yet
            </p>
          )}
        </div>
      )}
    </section>
  );
}

function NotStarted(callbacks: Callbacks) {
  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col">
        <Option
          icon={<GraduationCap className="size-5" aria-hidden />}
          title="Review in easyImmerse"
          description="Study the cards here, with spaced repetition."
          onClick={callbacks.onStartReview}
        />
        <Option
          icon={<Download className="size-5" aria-hidden />}
          title="Export an Anki deck"
          description="Save a package to import into Anki."
          onClick={callbacks.onExportPackage}
        />
        <Option
          icon={<Plug className="size-5" aria-hidden />}
          title="Set up AnkiConnect"
          description="Send new cards straight to Anki while it runs."
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
  onClick,
}: {
  icon: ReactNode;
  title: string;
  description: string;
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
        <span className="flex flex-col">
          <span className="font-medium">{title}</span>
          <span className="text-xs text-fg-muted">{description}</span>
        </span>
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
          summary={
            state.unexportedCount === 0
              ? "Every flashcard has been exported."
              : `${pluralize(state.unexportedCount, "new flashcard")} since the last export.`
          }
          action={
            <Button
              variant="primary"
              disabled={state.unexportedCount === 0}
              onClick={callbacks.onExportPackage}
            >
              <Download className="size-4" aria-hidden />
              Export the new cards
            </Button>
          }
        />
      );
    case "ankiConnect":
      return (
        <StatusBlock
          badge={
            state.connection === "connected" ? (
              <Badge tone="success">Anki connected</Badge>
            ) : (
              <Badge tone="danger">Anki unreachable</Badge>
            )
          }
          summary={
            state.unsentCount === 0
              ? "Every flashcard is in Anki."
              : `${pluralize(state.unsentCount, "flashcard")} waiting to be sent.`
          }
          hint={
            state.connection === "unreachable"
              ? "Start Anki with the AnkiConnect add-on installed. Cards are sent as soon as it answers."
              : undefined
          }
          action={
            <Button
              variant="primary"
              disabled={
                state.unsentCount === 0 || state.connection === "unreachable"
              }
              onClick={callbacks.onSendToAnki}
            >
              <Send className="size-4" aria-hidden />
              Send to Anki
            </Button>
          }
        />
      );
  }
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
      <div className="pt-1">{action}</div>
    </div>
  );
}
