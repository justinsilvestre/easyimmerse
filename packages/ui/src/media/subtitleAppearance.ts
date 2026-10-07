/** How the subtitles over the video look: the box behind them and their text. */
export type SubtitleAppearance = {
  boxColor: "black" | "grey" | "white";
  /** How opaque the box is, as a whole percentage. */
  boxOpacity: number;
  textShadow: "none" | "soft" | "strong";
  /** An index into `subtitleTextScales`. */
  textSizeStep: number;
  textColor: "white" | "yellow" | "black";
};

export const defaultSubtitleAppearance: SubtitleAppearance = {
  boxColor: "black",
  boxOpacity: 40,
  textShadow: "soft",
  textSizeStep: 2,
  textColor: "white",
};

/** The text sizes on offer, as multiples of the default size. */
export const subtitleTextScales = [0.75, 0.875, 1, 1.125, 1.25, 1.5];

/** The colors of the box, as the red, green and blue channels of an `rgb()` color. */
export const boxColorChannels: Record<SubtitleAppearance["boxColor"], string> =
  {
    black: "0 0 0",
    grey: "55 65 81",
    white: "255 255 255",
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
    boxColor: pick("boxColor", isOneOf(Object.keys(boxColorChannels))),
    boxOpacity: pick("boxOpacity", isWholeNumberUpTo(100)),
    textShadow: pick("textShadow", isOneOf(["none", "soft", "strong"])),
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
