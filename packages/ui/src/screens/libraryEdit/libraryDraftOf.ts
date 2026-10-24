import type { LibraryItem, LibraryItemDraft } from "@easyimmerse/types";

/** Returns the metadata of an item as the form that changes it starts from. */
export function libraryDraftOf(item: LibraryItem): LibraryItemDraft {
  const { title, description, language, translation_language, kind } = item;
  const { difficulty, tags, cover_at_ms } = item;
  return {
    title,
    description,
    language,
    translation_language,
    kind,
    difficulty,
    tags,
    cover_at_ms,
  };
}
