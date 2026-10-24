import type { DictionaryDefinitions } from "@easyimmerse/types";
import clsx from "clsx";
import { DefinitionView } from "./definition/DefinitionView.tsx";
import type { ResolveMediaUrl } from "./definition/definitionContext.ts";
import { yomitanClassName } from "./definition/yomitanClassName.ts";
import { resolveTags } from "./resolveTags.ts";
import { DictionaryScope } from "./stylesheet/DictionaryScope.tsx";
import { TagList } from "./TagList.tsx";

/**
 * Shows one dictionary's definitions of a result, under the dictionary's title and its definition tags, inside the scope its stylesheet applies to.
 * The title, list and definitions carry the classes Yomitan gives them (`tag`, `gloss-list`, `gloss-item`, `gloss-separator`, `gloss-content`), so that stylesheets written for Yomitan apply.
 */
export function DictionaryDefinitionsSection({
  dictionaryDefinitions: { dictionaryId, dictionaryTitle, entry, tags },
  resolveMediaUrl,
  onWordLookup,
  onWordHold,
  onLookup,
}: {
  dictionaryDefinitions: DictionaryDefinitions;
  resolveMediaUrl: ResolveMediaUrl;
  onWordLookup: (word: string) => void;
  onWordHold?: (word: string) => void;
  onLookup: (term: string) => void;
}) {
  return (
    <section aria-label={dictionaryTitle}>
      <DictionaryScope dictionaryId={dictionaryId}>
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <DictionaryTitleTag title={dictionaryTitle} />
            <TagList tags={resolveTags(entry.definitionTags, tags)} />
          </div>
          <ol
            className={clsx(
              yomitanClassName("gloss-list"),
              "flex flex-col gap-1 text-sm",
              entry.definitions.length > 1 && "list-decimal pl-6",
            )}
          >
            {entry.definitions.map((definition, index) => (
              <li
                // Definitions can repeat within an entry and never reorder.
                // biome-ignore lint/suspicious/noArrayIndexKey: see above
                key={index}
                className={clsx(
                  yomitanClassName("gloss-item"),
                  "min-w-0 break-words",
                )}
              >
                <GlossSeparator />
                <div className={yomitanClassName("gloss-content")}>
                  <DefinitionView
                    definition={definition}
                    dictionaryId={dictionaryId}
                    resolveMediaUrl={resolveMediaUrl}
                    onWordLookup={onWordLookup}
                    onWordHold={onWordHold}
                    onLookup={onLookup}
                  />
                </div>
              </li>
            ))}
          </ol>
        </div>
      </DictionaryScope>
    </section>
  );
}

/** The dictionary's title, marked as Yomitan marks the tag that names a definition's dictionary. */
function DictionaryTitleTag({ title }: { title: string }) {
  return (
    <span className={yomitanClassName("tag")} data-category="dictionary">
      <span
        className={clsx(
          yomitanClassName("tag-label"),
          "text-xs font-medium text-fg-faint",
        )}
      >
        <span className={yomitanClassName("tag-label-content")}>{title}</span>
      </span>
    </span>
  );
}

/**
 * The separator Yomitan puts before each definition, which it shows only when it runs definitions together on one line.
 * The pop-up always lists definitions on their own lines, so it stays hidden unless a dictionary's stylesheet shows it.
 */
function GlossSeparator() {
  return (
    <span className={clsx(yomitanClassName("gloss-separator"), "hidden")}>
      {" "}
    </span>
  );
}
