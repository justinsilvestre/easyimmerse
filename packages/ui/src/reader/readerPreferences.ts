import {
  defaultReaderPreferences,
  type ReaderPreferences,
} from "@easyimmerse/state";

/** The text size of each of the reader's size steps, in rem, from the smallest. */
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
  const defaultRem = fontSizesRem[defaultReaderPreferences.fontSizeStep] ?? 1;
  return Math.round((sizeRem / defaultRem) * 100);
}
