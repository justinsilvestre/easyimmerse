import { createSelector } from "reselect";
import type { AppState } from "../app/appState.ts";

const themes = ["auto", "light", "sepia", "dark"] as const;
const fonts = ["serif", "sans"] as const;
const lineSpacings = ["compact", "normal", "relaxed"] as const;
const lineLengths = ["narrow", "medium", "wide"] as const;
const layouts = ["pages", "scroll"] as const;

/** How many text sizes the reader offers, from the smallest at step 0. */
export const readerFontSizeStepCount = 9;

/** How the reader lays out and colors the text. Every reader shares one set. */
export type ReaderPreferences = {
  /** `auto` follows the app's theme. */
  theme: (typeof themes)[number];
  font: (typeof fonts)[number];
  /** The text size, from 0 to one less than `readerFontSizeStepCount`. */
  fontSizeStep: number;
  lineSpacing: (typeof lineSpacings)[number];
  lineLength: (typeof lineLengths)[number];
  isJustified: boolean;
  layout: (typeof layouts)[number];
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

/**
 * Returns the reader's preferences as stored, with anything missing or unknown replaced by its default.
 * The result keeps its reference while the stored value does.
 */
export const selectReaderPreferences = createSelector(
  [
    (app: Pick<AppState, "preferences">) =>
      app.preferences.values.readerPreferences,
  ],
  parseReaderPreferences,
);

function parseReaderPreferences(value: string | undefined): ReaderPreferences {
  const stored = parseObject(value);
  const pick = <Key extends keyof ReaderPreferences>(
    key: Key,
    isValid: (candidate: unknown) => boolean,
  ): ReaderPreferences[Key] =>
    isValid(stored[key])
      ? (stored[key] as ReaderPreferences[Key])
      : defaultReaderPreferences[key];
  return {
    theme: pick("theme", isOneOf(themes)),
    font: pick("font", isOneOf(fonts)),
    fontSizeStep: pick("fontSizeStep", isFontSizeStep),
    lineSpacing: pick("lineSpacing", isOneOf(lineSpacings)),
    lineLength: pick("lineLength", isOneOf(lineLengths)),
    isJustified: pick(
      "isJustified",
      (candidate) => typeof candidate === "boolean",
    ),
    layout: pick("layout", isOneOf(layouts)),
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

function isFontSizeStep(candidate: unknown): boolean {
  return (
    Number.isInteger(candidate) &&
    (candidate as number) >= 0 &&
    (candidate as number) < readerFontSizeStepCount
  );
}
