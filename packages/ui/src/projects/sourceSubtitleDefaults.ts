import type { AvailableSubtitle } from "@easyimmerse/types";

/** The languages of a project, as tags such as "ja" or "en-US". */
export type ProjectLanguages = { target: string; translation: string };

/**
 * The subtitle tracks to fetch unless the user chooses otherwise: the first offered in
 * the project's target language and the first in its translation language, skipping
 * tracks named in `alreadyAdded`, such as those fetched earlier.
 */
export function defaultSubtitleChoice(
  subtitles: readonly AvailableSubtitle[],
  languages: ProjectLanguages,
  alreadyAdded: readonly string[] = [],
): string[] {
  const offered = subtitles.filter(
    (subtitle) => !alreadyAdded.includes(subtitle.name),
  );
  const ids = [languages.target, languages.translation].flatMap((language) => {
    const first = offered.find((subtitle) =>
      isSameLanguage(subtitle.language, language),
    );
    return first ? [first.id] : [];
  });
  return [...new Set(ids)];
}

/** Compares the primary subtags of two language tags, so that "ja-JP" matches "ja". */
function isSameLanguage(a: string | null, b: string): boolean {
  if (a === null) return false;
  return primarySubtag(a) === primarySubtag(b);
}

function primarySubtag(tag: string): string {
  return (tag.split(/[-_]/)[0] ?? tag).toLowerCase();
}
