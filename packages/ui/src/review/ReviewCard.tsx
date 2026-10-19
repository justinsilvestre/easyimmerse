import type { FlashcardContent, FlashcardFieldKey } from "@easyimmerse/types";
import { cardSidesOf } from "../flashcards/cardSidesOf.ts";
import {
  type FlashcardFieldContext,
  FlashcardSideFields,
} from "../flashcards/FlashcardSideFields.tsx";
import type { FlashcardLanguages } from "../flashcards/flashcardFields.ts";

/** A card as the review screen shows it. */
export type ReviewCardView = {
  flashcardId: string;
  content: FlashcardContent;
  /** The image of the card's screenshot. Null when none can be shown. */
  screenshotUrl: string | null;
  /** Whether the card's media file cannot be read on this device, so that its audio and screenshot are left out. */
  isMediaUnavailable: boolean;
};

const mediaFields: readonly FlashcardFieldKey[] = [
  "audio_context",
  "screenshot",
];

/**
 * Shows a card for review, larger than its preview and without the side labels.
 * The back appears under a dashed line once the answer is revealed.
 */
export function ReviewCard({
  content,
  includedFields,
  frontFields,
  languages,
  screenshotUrl,
  isRevealed,
  isMediaUnavailable,
  onPlayAudio,
}: {
  content: FlashcardContent;
  includedFields: readonly FlashcardFieldKey[];
  frontFields: readonly FlashcardFieldKey[];
  languages: FlashcardLanguages;
  screenshotUrl: string | null;
  isRevealed: boolean;
  isMediaUnavailable: boolean;
  onPlayAudio: () => void;
}) {
  const shownFields = isMediaUnavailable
    ? includedFields.filter((key) => !mediaFields.includes(key))
    : includedFields;
  const sides = cardSidesOf(content, shownFields, frontFields);
  const context = {
    content,
    languages,
    size: "large",
    screenshotUrl,
    onPlayAudio,
  } satisfies Omit<FlashcardFieldContext, "side">;
  return (
    <div className="flex w-full max-w-xl animate-card-in flex-col gap-3 self-center">
      <article
        aria-label="Flashcard"
        className="flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-sm"
      >
        <section className="flex flex-col items-center gap-3 px-6 py-10 text-center sm:px-10">
          <FlashcardSideFields
            fields={sides.front}
            context={{ ...context, side: "front" }}
          />
        </section>
        {isRevealed && (
          <section
            aria-label="Answer"
            className="flex flex-col gap-3 border-t border-dashed border-line-strong bg-surface-muted px-6 py-6 text-base sm:px-10"
          >
            <FlashcardSideFields
              fields={sides.back}
              context={{ ...context, side: "back" }}
            />
          </section>
        )}
      </article>
      {isMediaUnavailable && (
        <p className="text-center text-xs text-fg-muted">
          Audio and screenshot are unavailable on this device.
        </p>
      )}
    </div>
  );
}
