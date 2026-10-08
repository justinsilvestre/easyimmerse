import type { CSSProperties } from "react";
import {
  type SubtitleAppearance,
  subtitleTextScales,
  textColors,
} from "./subtitleAppearance.ts";

/** How many lines the box keeps room for, of each language. */
export type SubtitleBoxLines = { target: number; translation: number };

/** The styles of the subtitle box and of its two kinds of line. */
export type SubtitleBoxStyles = {
  box: CSSProperties;
  target: CSSProperties;
  translation: CSSProperties;
};

const lineHeight = 1.35;

/** The vertical padding of the box, in rem. */
const boxPaddingRem = 0.5;

/** The red, green and blue channels of the background's neutral dark, as in an `rgb()` color. */
const backgroundChannels = "0 0 0";

/**
 * The styles that give the subtitle box the user's appearance, with a height that fits the given lines
 * whatever the cue, so that the box keeps its size from one cue to the next.
 * The text grows with the width of the nearest CSS container.
 * The box itself is clear, so that the backdrop from `subtitleBackdropStyles` can reach beyond it.
 */
export function subtitleBoxStyles(
  appearance: SubtitleAppearance,
  lines: SubtitleBoxLines,
): SubtitleBoxStyles {
  const scale = subtitleTextScales[appearance.textSizeStep] ?? 1;
  const targetSize = `calc(clamp(1.5rem, 3.3cqw + 0.75rem, 3.75rem) * ${scale})`;
  const translationSize = `calc(clamp(1.3125rem, 2.25cqw + 0.5625rem, 2.625rem) * ${scale})`;
  return {
    box: {
      height: `calc(${lines.target * lineHeight} * ${targetSize} + ${lines.translation * lineHeight} * ${translationSize} + ${2 * boxPaddingRem}rem)`,
      paddingBlock: `${boxPaddingRem}rem`,
      color: textColors[appearance.textColor],
      textShadow: textShadowOf(appearance),
      lineHeight,
    },
    target: { fontSize: targetSize },
    translation: { fontSize: translationSize },
  };
}

/**
 * The styles of the backdrop behind the subtitle box, a neutral dark at the user's opacity,
 * and of the feathered edge that fades the backdrop in above it.
 */
export function subtitleBackdropStyles(appearance: SubtitleAppearance): {
  backdrop: CSSProperties;
  feather: CSSProperties;
} {
  const opacity = appearance.backgroundOpacity / 100;
  return {
    backdrop: { backgroundColor: `rgb(${backgroundChannels} / ${opacity})` },
    feather: {
      backgroundImage: `linear-gradient(to bottom, rgb(${backgroundChannels} / 0), rgb(${backgroundChannels} / ${opacity}))`,
    },
  };
}

/** A shadow in the color opposite the text's, so that the text stands out from the picture behind it. */
function textShadowOf(appearance: SubtitleAppearance): string {
  const channels = appearance.textColor === "black" ? "255 255 255" : "0 0 0";
  switch (appearance.textShadow) {
    case "none":
      return "none";
    case "light":
      return `0 1px 3px rgb(${channels} / 0.8)`;
    case "medium":
      return `0 0 2px rgb(${channels}), 0 0 3px rgb(${channels}), 0 2px 4px rgb(${channels})`;
    case "heavy":
      return `-1px -1px 0 rgb(${channels}), 1px -1px 0 rgb(${channels}), -1px 1px 0 rgb(${channels}), 1px 1px 0 rgb(${channels}), 0 0 4px rgb(${channels}), 0 2px 6px rgb(${channels})`;
  }
}
