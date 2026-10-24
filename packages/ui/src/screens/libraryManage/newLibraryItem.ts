import type { LibraryUpload } from "@easyimmerse/state";
import type { LibraryItemDraft, LibraryItemKind } from "@easyimmerse/types";

/** A new library item as its form gives it: the draft to create, the file to upload, and for media its subtitle files. */
export type NewLibraryItem = {
  draft: LibraryItemDraft;
  file: File;
  subtitles: { target: File; translation: File | null } | null;
};

/** Returns the new item the form's fields describe, or null while a file it needs is missing. */
export function newLibraryItemOf(
  form: FormData,
  upload: LibraryUpload,
): NewLibraryItem | null {
  const file = fileOf(form, upload === "media" ? "media" : "text");
  const target = fileOf(form, "subtitles");
  if (file === null || (upload === "media" && target === null)) return null;
  const draft = {
    title: String(form.get("title") ?? "").trim() || file.name,
    description: "",
    language: String(form.get("language")),
    translation_language: String(form.get("translationLanguage")),
    kind: kindOf(file, upload),
    difficulty: null,
    tags: [],
  } satisfies LibraryItemDraft;
  const subtitles =
    upload === "media" && target
      ? { target, translation: fileOf(form, "translationSubtitles") }
      : null;
  return { draft, file, subtitles };
}

function kindOf(file: File, upload: LibraryUpload): LibraryItemKind {
  if (upload === "text") return "document";
  return file.type.startsWith("audio/") ? "audio" : "video";
}

function fileOf(form: FormData, name: string): File | null {
  const value = form.get(name);
  return value instanceof File && value.size > 0 ? value : null;
}
