import type { ReviewEnd } from "@easyimmerse/state";
import clsx from "clsx";
import { CalendarCheck, CircleAlert, CircleCheck, Layers } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "../components/Button.tsx";
import { pluralize } from "../components/pluralize.ts";
import { nextReviewPhrase, timeOfDay } from "./nextReviewPhrase.ts";

/** Says that the review session is over, that it has nothing to show, or that its cards could not be loaded, with the way back to the project. */
export function ReviewDone({
  end,
  onBack,
  onLearnMore,
  onReviewMore,
  onRetry,
}: {
  end: ReviewEnd;
  onBack: () => void;
  onLearnMore: () => void;
  /** Raises today's allowance by as many reviews of those the day's limit left for later days. */
  onReviewMore: (reviewCount: number) => void;
  onRetry: () => void;
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
            end.reviewedCount > 0 &&
              `You reviewed ${pluralize(end.reviewedCount, "card")}.`,
            end.comesBack && comesBackLine(end.comesBack),
            end.heldBackCount > 0 && heldBackLine(end.heldBackCount),
          ]}
        >
          {back}
          {end.moreReviewCount > 0 && (
            <Button
              variant="subtle"
              onClick={() => onReviewMore(end.moreReviewCount)}
            >
              Review {end.moreReviewCount} more now
            </Button>
          )}
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
    case "failed":
      return (
        <Ending
          icon={
            <IconDisc className="bg-danger-soft text-danger-fg">
              <CircleAlert className="size-7" aria-hidden />
            </IconDisc>
          }
          title="Could not load the cards"
          lines={["Check the connection to the server, then try again."]}
        >
          {back}
          <Button variant="primary" onClick={onRetry}>
            Try again
          </Button>
        </Ending>
      );
  }
}

/** Says that the reviews beyond the day's limit come up on the next days, and that new cards wait for them. */
function heldBackLine(count: number) {
  const verb = count === 1 ? "is" : "are";
  const pronoun = count === 1 ? "It comes" : "They come";
  return `Another ${pluralize(count, "review")} ${verb} due, more than the daily limit. ${pronoun} up over the next few days, and new cards are paused until you have caught up.`;
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
