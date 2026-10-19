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
          icon={<CircleCheck className="size-8 text-success-fg" aria-hidden />}
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
          icon={<CalendarCheck className="size-8 text-fg-faint" aria-hidden />}
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
          icon={<Layers className="size-8 text-fg-faint" aria-hidden />}
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

/** Lays out an end state as `EmptyState` does, without its dashed border. */
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
    <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
      {icon}
      <h1 className="text-lg font-semibold">{title}</h1>
      {lines.map(
        (line) =>
          line && (
            <p key={line} className="max-w-sm text-sm text-fg-muted">
              {line}
            </p>
          ),
      )}
      <div className="mt-2 flex flex-wrap justify-center gap-2">{children}</div>
    </div>
  );
}
