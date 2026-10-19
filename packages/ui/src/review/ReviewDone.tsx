import clsx from "clsx";
import { CalendarCheck, CircleCheck, Layers } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "../components/Button.tsx";
import { pluralize } from "../components/pluralize.ts";
import { nextReviewPhrase, timeOfDay } from "./nextReviewPhrase.ts";

/** Why a review session has no card to show. */
export type ReviewEnd =
  | {
      kind: "doneForToday";
      reviewedCount: number;
      /** The cards still being learned that fall due later today, and when the first of them does. */
      comesBack: { count: number; atMs: number } | null;
      /** The new cards that "Learn more" would add to today's, beyond the day's allowance. None hides the button. */
      moreNewCount: number;
    }
  | { kind: "nothingDue"; nextDueAtMs: number | null }
  | { kind: "noFlashcards" };

/** Says that the review session is over, or that it has nothing to show, with the way back to the project. */
export function ReviewDone({
  end,
  onBack,
  onLearnMore,
}: {
  end: ReviewEnd;
  onBack: () => void;
  onLearnMore: () => void;
}) {
  const back = <Button onClick={onBack}>Back to project</Button>;
  switch (end.kind) {
    case "doneForToday":
      return (
        <Ending
          icon={
            <IconDisc className="bg-success-soft text-success-fg">
              <CircleCheck className="size-7" aria-hidden />
            </IconDisc>
          }
          title="Done for today"
          lines={[
            `You reviewed ${pluralize(end.reviewedCount, "card")}.`,
            end.comesBack && comesBackLine(end.comesBack),
          ]}
        >
          {back}
          {end.moreNewCount > 0 && (
            <Button variant="subtle" onClick={onLearnMore}>
              Learn {end.moreNewCount} more new cards
            </Button>
          )}
        </Ending>
      );
    case "nothingDue":
      return (
        <Ending
          icon={
            <IconDisc className="bg-surface-muted text-fg-faint">
              <CalendarCheck className="size-7" aria-hidden />
            </IconDisc>
          }
          title="Nothing to review"
          lines={[
            end.nextDueAtMs !== null &&
              `Next review ${nextReviewPhrase(end.nextDueAtMs)}.`,
          ]}
        >
          {back}
        </Ending>
      );
    case "noFlashcards":
      return (
        <Ending
          icon={
            <IconDisc className="bg-surface-muted text-fg-faint">
              <Layers className="size-7" aria-hidden />
            </IconDisc>
          }
          title="No flashcards yet"
          lines={[
            "Make flashcards while you watch or read, and review them here.",
          ]}
        >
          {back}
        </Ending>
      );
  }
}

function comesBackLine({ count, atMs }: { count: number; atMs: number }) {
  const verb = count === 1 ? "comes" : "come";
  return `${pluralize(count, "card")} ${verb} back at ${timeOfDay(atMs)}.`;
}

/** Sets an end state's icon in a soft disc, so that it carries the same weight as the card did. */
function IconDisc({
  className,
  children,
}: {
  className: string;
  children: ReactNode;
}) {
  return (
    <div
      className={clsx(
        "mb-1 flex size-14 items-center justify-center rounded-full",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Lays out an end state as `EmptyState` does, without its dashed border, entering as a card does. */
function Ending({
  icon,
  title,
  lines,
  children,
}: {
  icon: ReactNode;
  title: string;
  lines: readonly (string | false | null)[];
  children: ReactNode;
}) {
  return (
    <div className="flex animate-card-in flex-col items-center gap-3 px-6 py-16 text-center sm:py-24">
      {icon}
      <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
      {lines.map(
        (line) =>
          line && (
            <p key={line} className="max-w-sm text-sm text-fg-muted">
              {line}
            </p>
          ),
      )}
      <div className="mt-3 flex flex-wrap justify-center gap-2">{children}</div>
    </div>
  );
}
