import type { MediaItem } from "./MediaList.tsx";

/** A category the project's media list can be narrowed to: everything, or one kind of file. */
export type MediaCategory = "all" | MediaItem["kind"];

export const mediaCategories: readonly MediaCategory[] = [
  "all",
  "video",
  "audio",
  "ebook",
];

const categoryLabels: Record<MediaCategory, string> = {
  all: "Media",
  video: "Videos",
  audio: "Audio",
  ebook: "Ebooks",
};

/** Names a category as the heading shows it, such as "Videos". */
export function mediaCategoryLabel(category: MediaCategory): string {
  return categoryLabels[category];
}

/** The items of a category, in their order. */
export function mediaOfCategory(
  media: readonly MediaItem[],
  category: MediaCategory,
): MediaItem[] {
  return media.filter((item) => category === "all" || item.kind === category);
}
