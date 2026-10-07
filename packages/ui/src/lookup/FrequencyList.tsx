import type { DictionaryFrequency } from "@easyimmerse/types";
import { Badge } from "../components/Badge.tsx";

/**
 * Shows how common a term is according to each frequency dictionary, as "dictionary: value" badges after a "Frequency" label.
 * Each badge explains itself in a tooltip, since a bare rank means little to a newcomer.
 */
export function FrequencyList({
  frequencies,
}: {
  frequencies: readonly DictionaryFrequency[];
}) {
  if (frequencies.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1 text-xs text-fg-faint">
      <span>Frequency</span>
      <ul aria-label="Frequencies" className="contents">
        {frequencies.map(
          ({ dictionaryId, dictionaryTitle, frequency }, index) => (
            // One dictionary may rank several readings of a term.
            // biome-ignore lint/suspicious/noArrayIndexKey: see above
            <li key={`${dictionaryId}-${index}`}>
              <Badge
                title={`How common the word is according to ${dictionaryTitle}. A lower rank is more common.`}
              >
                {dictionaryTitle}: {frequency.display ?? frequency.value ?? "?"}
              </Badge>
            </li>
          ),
        )}
      </ul>
    </div>
  );
}
