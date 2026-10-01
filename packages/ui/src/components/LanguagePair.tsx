import { formatLanguageName } from "../formatLanguageName.ts";

/** Names a project's target and translation languages, as in "German → English". */
export function LanguagePair({
  targetLanguage,
  translationLanguage,
}: {
  targetLanguage: string;
  translationLanguage: string;
}) {
  return (
    <span>
      {formatLanguageName(targetLanguage)} <span aria-hidden="true">→</span>
      <span className="sr-only">to</span>{" "}
      {formatLanguageName(translationLanguage)}
    </span>
  );
}
