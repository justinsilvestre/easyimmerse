import type { DictionaryPronunciation } from "@easyimmerse/types";
import { PitchAccentView } from "./PitchAccentView.tsx";

/** Shows each dictionary's pitch accents and IPA transcriptions of a term, labelled by dictionary. */
export function PronunciationList({
  pronunciations,
  reading,
}: {
  pronunciations: readonly DictionaryPronunciation[];
  reading: string;
}) {
  if (pronunciations.length === 0) return null;
  return (
    <ul aria-label="Pronunciations" className="flex flex-col gap-0.5 text-sm">
      {pronunciations.map((pronunciation, index) => (
        <li
          // One dictionary may give pronunciations of several readings.
          // biome-ignore lint/suspicious/noArrayIndexKey: see above
          key={index}
          className="flex flex-wrap items-center gap-x-3 gap-y-0.5"
        >
          <Pronunciation
            pronunciation={pronunciation}
            reading={pronunciation.reading ?? reading}
          />
          <span className="text-xs text-fg-faint">
            {pronunciation.dictionaryTitle}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Pronunciation({
  pronunciation: { data },
  reading,
}: {
  pronunciation: DictionaryPronunciation;
  reading: string;
}) {
  switch (data.kind) {
    case "pitch":
      return data.pitches.map((accent, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: a dictionary's accents for a reading never reorder
        <PitchAccentView key={index} reading={reading} accent={accent} />
      ));
    case "ipa":
      return data.transcriptions.map(({ ipa, tags }) => (
        <span key={ipa}>
          {ipa}
          {tags.length > 0 && (
            <span className="ml-1 text-xs text-fg-faint">
              {tags.join(", ")}
            </span>
          )}
        </span>
      ));
    case "frequency":
      return null;
  }
}
