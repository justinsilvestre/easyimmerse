import type { KanjiResult } from "@easyimmerse/types";
import { ClickableText } from "../components/ClickableText.tsx";
import { FrequencyList } from "./FrequencyList.tsx";
import { resolveTags } from "./resolveTags.ts";
import { TagList } from "./TagList.tsx";

/** One kanji in the dictionary pop-up: the character, its readings and meanings, and facts such as stroke count labelled by the dictionary's tags. */
export function KanjiCard({
  result,
  onWordClick,
}: {
  result: KanjiResult;
  onWordClick: (word: string) => void;
}) {
  const { entry, tags } = result;
  return (
    <article
      aria-label={`Kanji ${entry.character}`}
      className="flex gap-3 border-t border-line py-3 first:border-t-0 first:pt-0"
    >
      <span lang="ja" className="text-5xl leading-none">
        {entry.character}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 text-sm">
        <TagList tags={resolveTags(entry.tags, tags)} />
        <Readings label="On" readings={entry.onyomi} />
        <Readings label="Kun" readings={entry.kunyomi} />
        <p>
          <ClickableText
            text={entry.meanings.join(", ")}
            gestures={{ onWordClick: (hit) => onWordClick(hit.word) }}
          />
        </p>
        <FrequencyList frequencies={result.frequencies} />
        <KanjiStats result={result} />
        <span className="text-xs text-fg-faint">{result.dictionaryTitle}</span>
      </div>
    </article>
  );
}

function Readings({
  label,
  readings,
}: {
  label: string;
  readings: readonly string[];
}) {
  if (readings.length === 0) return null;
  return (
    <p lang="ja">
      <span className="mr-2 text-xs text-fg-faint">{label}</span>
      {readings.map((reading, index) => {
        // A dot separates the part of a kun reading that is written in kana after the kanji.
        const [stem, okurigana] = reading.split(".");
        return (
          <span key={reading}>
            {index > 0 && "、"}
            {stem}
            {okurigana && <span className="text-fg-faint">{okurigana}</span>}
          </span>
        );
      })}
    </p>
  );
}

function KanjiStats({ result: { entry, tags } }: { result: KanjiResult }) {
  const stats = resolveTags(Object.keys(entry.stats), tags);
  if (stats.length === 0) return null;
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 text-xs">
      {stats.map((stat) => (
        <div key={stat.name} className="contents">
          <dt className="text-fg-muted">{stat.notes || stat.name}</dt>
          <dd>{entry.stats[stat.name]}</dd>
        </div>
      ))}
    </dl>
  );
}
