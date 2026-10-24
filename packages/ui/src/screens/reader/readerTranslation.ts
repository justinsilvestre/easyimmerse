import type { ReaderLocation, ReaderViewMode } from "@easyimmerse/state";
import type { Document, MediaFile, TranslationLink } from "@easyimmerse/types";
import type { ReactNode } from "react";
import { translationParagraphsOf } from "./alignment/translationAlignment.ts";

/** The translation a book is read with, and how to change it, as the reader view takes them. */
export type ReaderTranslation = {
  /** The project's other ebooks and text files, any of which can be paired with the book as its translation. */
  candidates: readonly MediaFile[];
  /** The translation the book is paired with, or null when it has none. */
  paired: MediaFile | null;
  /** The paired translation's text, with its hard line breaks unwrapped; null while it loads, or when none is paired. */
  document: Document | null;
  /** The language of the translation's text. */
  language: string;
  /** The links of the book's newest translation alignment, when it is with the paired translation; null while the two are not aligned. */
  links: readonly TranslationLink[] | null;
  /** Pairs the book with another document of the project, or removes the pairing with null. */
  onChoose: (mediaFileId: string | null) => void;
  /** Starts combining the book and its translation into a bilingual ebook. */
  onCombine: () => void;
  /** The dialog that combining opened, shown over the reader, if any. */
  dialog?: ReactNode;
};

/** The views the reader offers: the book alone, and with a paired translation, the translation alone, and both together once they are aligned. */
export function viewModesOf(
  translation: ReaderTranslation | undefined,
): ReaderViewMode[] {
  if (!translation?.paired) return ["target"];
  return translation.links
    ? ["target", "translation", "interlinear", "parallel"]
    : ["target", "translation"];
}

/**
 * Where the translation-only view opens from a place in the book: at the first paragraph of the translation
 * linked from the place's paragraph, or undefined where no link leaves it, so that the view opens where it was left.
 */
export function translationLocationFor(
  links: readonly TranslationLink[] | null,
  location: ReaderLocation,
): ReaderLocation | undefined {
  const [first] = links
    ? translationParagraphsOf(
        links,
        location.chapterIndex,
        location.paragraphIndex,
      )
    : [];
  return first && { ...first, offset: 0 };
}
