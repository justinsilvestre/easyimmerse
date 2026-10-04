import type { DictionaryDefinitions } from "@easyimmerse/types";
import clsx from "clsx";
import { DefinitionView } from "./definition/DefinitionView.tsx";
import type { ResolveMediaUrl } from "./definition/definitionContext.ts";
import { resolveTags } from "./resolveTags.ts";
import { TagList } from "./TagList.tsx";

/** Shows one dictionary's definitions of a result, under the dictionary's title and its definition tags. */
export function DictionaryDefinitionsSection({
  dictionaryDefinitions: { dictionaryId, dictionaryTitle, entry, tags },
  resolveMediaUrl,
  onWordClick,
  onLookup,
}: {
  dictionaryDefinitions: DictionaryDefinitions;
  resolveMediaUrl: ResolveMediaUrl;
  onWordClick: (word: string) => void;
  onLookup: (term: string) => void;
}) {
  return (
    <section aria-label={dictionaryTitle} className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs font-medium text-fg-faint">
          {dictionaryTitle}
        </span>
        <TagList tags={resolveTags(entry.definitionTags, tags)} />
      </div>
      <ol
        className={clsx(
          "flex flex-col gap-1 text-sm",
          entry.definitions.length > 1 && "list-decimal pl-5",
        )}
      >
        {entry.definitions.map((definition, index) => (
          // Definitions can repeat within an entry and never reorder.
          // biome-ignore lint/suspicious/noArrayIndexKey: see above
          <li key={index} className="min-w-0 break-words">
            <DefinitionView
              definition={definition}
              dictionaryId={dictionaryId}
              resolveMediaUrl={resolveMediaUrl}
              onWordClick={onWordClick}
              onLookup={onLookup}
            />
          </li>
        ))}
      </ol>
    </section>
  );
}
