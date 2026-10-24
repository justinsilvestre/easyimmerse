import type { LibraryItem } from "@easyimmerse/types";
import { formatLibraryDuration } from "../../lib/library/libraryLabels.ts";

type CoveredItem = Pick<
  LibraryItem,
  "kind" | "cover" | "has_cover" | "file_name"
>;

const whenPublished = ", taken when the item is published.";

/** Says where an item's cover picture comes from, or that it has none. */
export function libraryCoverDescription(item: CoveredItem): string {
  const { cover, has_cover } = item;
  if (cover.kind === "uploaded") return "An uploaded picture.";
  if (item.kind === "video") {
    const source =
      cover.kind === "frame"
        ? `The frame at ${formatLibraryDuration(cover.at_ms)} into the video`
        : "The screenshot of the first line";
    return has_cover ? `${source}.` : `${source}${whenPublished}`;
  }
  return has_cover
    ? "The book's own cover, from its EPUB file."
    : "No cover picture.";
}

/** The label of the button that gives an item its automatic cover again, or null for an item that has it already. */
export function automaticCoverLabel(item: CoveredItem): string | null {
  if (item.cover.kind === "automatic") return null;
  if (item.kind === "video") return "Use the first line's screenshot";
  return isEpub(item) ? "Use the book's own cover" : "Remove the picture";
}

/** Whether the item is made from an EPUB file, whose own cover is its automatic cover. */
export function isEpub(item: Pick<LibraryItem, "kind" | "file_name">) {
  return (
    item.kind === "document" &&
    (item.file_name?.toLowerCase().endsWith(".epub") ?? false)
  );
}
