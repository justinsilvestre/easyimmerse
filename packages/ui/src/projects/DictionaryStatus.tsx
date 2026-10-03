import { BookOpen } from "lucide-react";
import { Badge } from "../components/Badge.tsx";
import { Button } from "../components/Button.tsx";
import { pluralize } from "../components/pluralize.ts";
import { languageName } from "./languages.ts";

/** How many dictionaries are enabled for one of the languages a project's flashcards use. */
export type LanguageDictionaryStatus = {
  language: string;
  role: "target" | "translation";
  dictionaryCount: number;
};

/** Shows whether each language of the project's flashcards has a dictionary, with the way to the dictionaries settings. */
export function DictionaryStatus({
  statuses,
  onOpenDictionaries,
}: {
  statuses: readonly LanguageDictionaryStatus[];
  onOpenDictionaries: () => void;
}) {
  const isAnyMissing = statuses.some((status) => status.dictionaryCount === 0);
  return (
    <section
      aria-label="Dictionaries"
      className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-line bg-surface px-4 py-3 text-sm"
    >
      <BookOpen className="size-4 text-fg-muted" aria-hidden />
      <ul className="flex flex-wrap gap-x-4 gap-y-1">
        {statuses.map((status) => (
          <li key={status.role} className="flex items-center gap-2">
            <span>
              {languageName(status.language)}
              <span className="text-fg-muted">
                {status.role === "target" ? " (target)" : " (translation)"}
              </span>
            </span>
            {status.dictionaryCount === 0 ? (
              <Badge tone="warning">No dictionary</Badge>
            ) : (
              <Badge tone="success">
                {pluralize(
                  status.dictionaryCount,
                  "dictionary",
                  "dictionaries",
                )}
              </Badge>
            )}
          </li>
        ))}
      </ul>
      <Button
        size="sm"
        variant={isAnyMissing ? "primary" : "subtle"}
        className="ml-auto"
        onClick={onOpenDictionaries}
      >
        {isAnyMissing ? "Set up dictionaries" : "Manage"}
      </Button>
    </section>
  );
}
