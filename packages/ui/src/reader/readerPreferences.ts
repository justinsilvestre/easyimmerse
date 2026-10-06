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

/** Reads stored preferences, replacing anything missing or unknown with its default. */
export function parseReaderPreferences(
  value: string | undefined,
): ReaderPreferences {
  const stored = parseObject(value);
  const pick = <Key extends keyof ReaderPreferences>(
    key: Key,
    isValid: (candidate: unknown) => boolean,
  ): ReaderPreferences[Key] =>
    isValid(stored[key])
      ? (stored[key] as ReaderPreferences[Key])
      : defaultReaderPreferences[key];
  return {
    theme: pick("theme", isOneOf(["auto", "light", "sepia", "dark"])),
    font: pick("font", isOneOf(Object.keys(fontFamilies))),
    fontSizeStep: pick("fontSizeStep", isIndexOf(fontSizesRem)),
    lineSpacing: pick("lineSpacing", isOneOf(Object.keys(lineHeights))),
    lineLength: pick("lineLength", isOneOf(Object.keys(lineLengthsEm))),
    isJustified: pick(
      "isJustified",
      (candidate) => typeof candidate === "boolean",
    ),
    layout: pick("layout", isOneOf(["pages", "scroll"])),
  };
}

function parseObject(value: string | undefined): Record<string, unknown> {
  try {
    const parsed: unknown = value === undefined ? null : JSON.parse(value);
    return typeof parsed === "object" && parsed !== null
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function isOneOf(options: readonly unknown[]) {
  return (candidate: unknown) => options.includes(candidate);
}

function isIndexOf(list: readonly unknown[]) {
  return (candidate: unknown) =>
    Number.isInteger(candidate) &&
    (candidate as number) >= 0 &&
    (candidate as number) < list.length;
}

/** The size of the text relative to the default, as a whole percentage. */
export function fontSizePercentOf(preferences: ReaderPreferences): number {
  const sizeRem = fontSizesRem[preferences.fontSizeStep] ?? 1;
  const defaultRem = fontSizesRem[defaultReaderPreferences.fontSizeStep] ?? 1;
  return Math.round((sizeRem / defaultRem) * 100);
}
