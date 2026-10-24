import clsx from "clsx";
import { Children, type ReactNode } from "react";

/**
 * Lays out the flashcards panel below its heading.
 * The card section is the `queue`, which captions the next card, with the main `action` at its bottom right.
 * The other content, `children`, goes on the left of the card section, or `above` it at full width.
 * When nothing goes beside it, the card section is centered.
 * Without a `queue`, as while the project has no flashcards, `children` take the whole width with the `action` under them on the right.
 * At phone width everything stacks, with the card section last.
 */
export function FlashcardsColumns({
  queue,
  action,
  placement = "beside",
  children,
}: {
  queue: ReactNode;
  action: ReactNode;
  placement?: "beside" | "above";
  children: ReactNode;
}) {
  // The other content keeps its place in the tree in every layout, so that its controls stay mounted when the first flashcard arrives.
  const hasCardSection = queue !== null;
  const isSideBySide =
    hasCardSection &&
    placement === "beside" &&
    Children.toArray(children).length > 0;
  return (
    <div
      className={clsx(
        "grid gap-4 text-sm",
        isSideBySide && "sm:grid-cols-[1fr_16rem] sm:gap-6",
      )}
    >
      <div className="flex min-w-0 flex-col items-start gap-3 empty:hidden">
        {children}
      </div>
      {hasCardSection ? (
        <div className="flex w-full flex-col gap-3">
          <div
            className={clsx(
              "w-full",
              !isSideBySide && "self-center sm:max-w-72",
            )}
          >
            {queue}
          </div>
          {action ? <div className="self-end">{action}</div> : null}
        </div>
      ) : (
        action && <div className="justify-self-end">{action}</div>
      )}
    </div>
  );
}
