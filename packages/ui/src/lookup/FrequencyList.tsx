import type { DictionaryFrequency } from "@easyimmerse/types";
import { Badge } from "../components/Badge.tsx";

/** Shows how common a term is according to each frequency dictionary, as "dictionary: value" badges. */
export function FrequencyList({
  frequencies,
}: {
  frequencies: readonly DictionaryFrequency[];
}) {
  if (frequencies.length === 0) return null;
  return (
    <ul aria-label="Frequencies" className="flex flex-wrap gap-1">
      {frequencies.map(
        ({ dictionaryId, dictionaryTitle, frequency }, index) => (
          // One dictionary may rank several readings of a term.
          // biome-ignore lint/suspicious/noArrayIndexKey: see above
          <li key={`${dictionaryId}-${index}`}>
            <Badge>
              {dictionaryTitle}: {frequency.display ?? frequency.value ?? "?"}
            </Badge>
          </li>
        ),
      )}
    </ul>
  );
}
