/** How the reader lays out and colors the text. Every reader shares one set. */
export type ReaderPreferences = {
  /** `auto` follows the app's theme. */
  theme: "auto" | "light" | "sepia" | "dark";
  font: "serif" | "sans";
  /** An index into `fontSizesRem`. */
  fontSizeStep: number;
  lineSpacing: "compact" | "normal" | "relaxed";
  lineLength: "narrow" | "medium" | "wide";
  isJustified: boolean;
  layout: "pages" | "scroll";
};

export const defaultReaderPreferences: ReaderPreferences = {
  theme: "auto",
  font: "serif",
  fontSizeStep: 2,
  lineSpacing: "normal",
  lineLength: "medium",
  isJustified: true,
  layout: "pages",
};

export const fontSizesRem = [0.875, 1, 1.125, 1.25, 1.375, 1.5, 1.75, 2, 2.5];

export const fontFamilies: Record<ReaderPreferences["font"], string> = {
  serif:
    '"Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, "Noto Serif", "Noto Serif CJK JP", "Hiragino Mincho ProN", serif',
  sans: 'system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans", "Hiragino Sans", sans-serif',
};

export const lineHeights: Record<ReaderPreferences["lineSpacing"], number> = {
  compact: 1.4,
  normal: 1.6,
  relaxed: 1.85,
};

/** The longest line, in multiples of the font size. */
export const lineLengthsEm: Record<ReaderPreferences["lineLength"], number> = {
  narrow: 26,
  medium: 32,
  wide: 40,
};

/** The size of the text relative to the default, as a whole percentage. */
export function fontSizePercentOf(preferences: ReaderPreferences): number {
  const sizeRem = fontSizesRem[preferences.fontSizeStep] ?? 1;
  return Math.round((sizeRem / 1.125) * 100);
}
