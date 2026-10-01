import type { NewFlashcard } from "@easyimmerse/types";

export function hasScreenshotField(card: NewFlashcard): boolean {
  return card.fields.some((field) => field.kind === "screenshot");
}
