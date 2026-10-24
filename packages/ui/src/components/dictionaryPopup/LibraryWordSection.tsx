import type { LookupResult } from "@easyimmerse/types";
import { Button } from "../common/Button.tsx";
import type { ResolveMediaUrl } from "./definition/definitionContext.ts";
import { LookupResultCard } from "./LookupResultCard.tsx";

/**
 * The top of the dictionary pop-up while a library manager prepares an item: the entry learners see for the text chosen,
 * as their pop-up shows it, with buttons that remove the word or give its entry to every word written the same.
 * Without a stored word there, it says that learners see no entry.
 */
export function LibraryWordSection({
  stored,
  resolveMediaUrl,
  onRemove,
  onApplyEverywhere,
}: {
  /** The stored word the chosen text overlaps, with its entry as a result, or null when it overlaps none. */
  stored: { text: string; result: LookupResult } | null;
  resolveMediaUrl: ResolveMediaUrl;
  onRemove: () => void;
  onApplyEverywhere: () => void;
}) {
  return (
    <section
      aria-label="For learners"
      className="flex flex-col gap-2 border-b border-line pb-3"
    >
      <h3 className="text-xs font-medium text-fg-muted">For learners</h3>
      {stored ? (
        <>
          <LookupResultCard
            result={stored.result}
            resolveMediaUrl={resolveMediaUrl}
            onWordLookup={ignore}
            onLookup={ignore}
          />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={onApplyEverywhere}>
              {`Use for every word “${stored.text}”`}
            </Button>
            <Button size="sm" variant="danger" onClick={onRemove}>
              Remove the word
            </Button>
          </div>
        </>
      ) : (
        <p className="text-sm text-fg-muted">
          Learners see no entry for this text yet.
        </p>
      )}
    </section>
  );
}

const ignore = () => undefined;
