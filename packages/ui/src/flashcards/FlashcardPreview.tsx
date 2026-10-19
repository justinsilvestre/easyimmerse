import type { FlashcardContent, FlashcardFieldKey } from "@easyimmerse/types";
import clsx from "clsx";
import { cardSidesOf } from "./cardSidesOf.ts";
import {
  type FlashcardFieldContext,
  FlashcardSideFields,
} from "./FlashcardSideFields.tsx";
import type { FlashcardLanguages } from "./flashcardFields.ts";

/**
 * Shows a flashcard as it would look when reviewed, with the included fields split between the front and the back.
 * The front holds the included `frontFields`; when none of them has a value, it shows the word and the sentence instead.
 * Fields outside `includedFields` are left out, and so is the whole back when `frontOnly` is set.
 */
export function FlashcardPreview({
  content,
  includedFields,
  frontFields,
  languages,
  compact = false,
  frontOnly = false,
  screenshotUrl = null,
  onPlayAudio,
}: {
  content: FlashcardContent;
  includedFields: readonly FlashcardFieldKey[];
  frontFields: readonly FlashcardFieldKey[];
  languages: FlashcardLanguages;
  compact?: boolean;
  frontOnly?: boolean;
  /** The image of the card's screenshot. Null when none can be shown. */
  screenshotUrl?: string | null;
  /** Plays the sentence audio. Without it, the preview only marks that the card has audio. */
  onPlayAudio?: () => void;
}) {
  const sides = cardSidesOf(content, includedFields, frontFields);
  const context = {
    content,
    languages,
    size: compact ? "compact" : "regular",
    screenshotUrl,
    onPlayAudio,
  } satisfies Omit<FlashcardFieldContext, "side">;
  return (
    <article
      aria-label="Flashcard preview"
      className={clsx(
        "flex flex-col overflow-hidden rounded-lg border border-line bg-surface shadow-sm",
        compact ? "text-[0.65rem]" : "text-sm",
      )}
    >
      <section
        className={clsx(
          "flex flex-col items-center gap-1 text-center",
          compact ? "px-3 py-2" : "px-4 py-4",
        )}
      >
        <SideLabel>Front</SideLabel>
        <FlashcardSideFields
          fields={sides.front}
          context={{ ...context, side: "front" }}
        />
      </section>
      {!frontOnly && (
        <section
          className={clsx(
            "flex flex-col border-t border-dashed border-line-strong bg-surface-muted",
            compact ? "gap-1 px-3 py-2" : "gap-2 px-4 py-3",
          )}
        >
          <SideLabel>Back</SideLabel>
          <FlashcardSideFields
            fields={sides.back}
            context={{ ...context, side: "back" }}
          />
        </section>
      )}
    </article>
  );
}

function SideLabel({ children }: { children: string }) {
  return (
    <span className="self-start text-[0.65rem] font-medium tracking-wider text-fg-faint uppercase">
      {children}
    </span>
  );
}
