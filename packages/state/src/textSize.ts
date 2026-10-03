/** How large the app's text is drawn. The medium size is the browser's default. */
export type TextSize = "small" | "medium" | "large";

export const textSizes: readonly TextSize[] = ["small", "medium", "large"];

/** Reads a stored text size, falling back to medium for anything unknown. */
export function parseTextSize(value: string | undefined): TextSize {
  return textSizes.find((size) => size === value) ?? "medium";
}
