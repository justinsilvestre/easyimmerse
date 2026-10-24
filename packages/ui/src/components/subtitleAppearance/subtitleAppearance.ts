/** How the subtitles over the video look: the dark background behind them and their text. */
export type SubtitleAppearance = {
  /** How opaque the background is, as a whole percentage. */
  backgroundOpacity: number;
  textShadow: (typeof subtitleTextShadows)[number];
  /** An index into `subtitleTextScales`. */
  textSizeStep: number;
  textColor: "white" | "yellow" | "black";
};

/** The text shadows on offer, from none to the heaviest. */
export const subtitleTextShadows = [
  "none",
  "light",
  "medium",
  "heavy",
] as const;

/** The text sizes on offer, as multiples of the default size. */
export const subtitleTextScales = [0.5, 0.75, 1, 1.25, 1.5];

export const defaultSubtitleAppearance: SubtitleAppearance = {
  backgroundOpacity: 25,
  textShadow: "medium",
  textSizeStep: 2,
  textColor: "white",
};

export const textColors: Record<SubtitleAppearance["textColor"], string> = {
  white: "#ffffff",
  yellow: "#fde047",
  black: "#000000",
};

/** Reads a stored appearance, replacing anything missing or unknown with its default. */
export function parseSubtitleAppearance(
  value: string | undefined,
): SubtitleAppearance {
  const stored = parseObject(value);
  const pick = <Key extends keyof SubtitleAppearance>(
    key: Key,
    isValid: (candidate: unknown) => boolean,
  ): SubtitleAppearance[Key] =>
    isValid(stored[key])
      ? (stored[key] as SubtitleAppearance[Key])
      : defaultSubtitleAppearance[key];
  return {
    backgroundOpacity: pick("backgroundOpacity", isWholeNumberUpTo(100)),
    textShadow: pick("textShadow", isOneOf(subtitleTextShadows)),
    textSizeStep: pick(
      "textSizeStep",
      isWholeNumberUpTo(subtitleTextScales.length - 1),
    ),
    textColor: pick("textColor", isOneOf(Object.keys(textColors))),
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

function isWholeNumberUpTo(maximum: number) {
  return (candidate: unknown) =>
    Number.isInteger(candidate) &&
    (candidate as number) >= 0 &&
    (candidate as number) <= maximum;
}
