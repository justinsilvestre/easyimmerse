import type { CSSProperties } from "react";
import { ChoiceRow } from "../components/ChoiceRow.tsx";
import {
  type SubtitleAppearance,
  subtitleTextScales,
  subtitleTextShadows,
  textColors,
} from "./subtitleAppearance.ts";
import {
  subtitleBackdropStyles,
  subtitleBoxStyles,
} from "./subtitleBoxStyles.ts";

const textShadowNames: Record<SubtitleAppearance["textShadow"], string> = {
  none: "None",
  light: "Light",
  medium: "Medium",
  heavy: "Heavy",
};

const textColorNames: Record<SubtitleAppearance["textColor"], string> = {
  white: "White",
  yellow: "Yellow",
  black: "Black",
};

/**
 * A live preview of the subtitles and the controls that set how they look: the background's opacity,
 * and the text's shadow, size and color. Each change applies at once.
 * The subtitle appearance dialog and the Subtitles section of Settings both show these controls.
 */
export function SubtitleAppearanceControls({
  appearance,
  onChange,
}: {
  appearance: SubtitleAppearance;
  onChange: (appearance: SubtitleAppearance) => void;
}) {
  const set = (change: Partial<SubtitleAppearance>) =>
    onChange({ ...appearance, ...change });
  return (
    <div className="flex flex-col gap-4">
      <Preview appearance={appearance} />
      <label className="flex flex-col gap-1.5 text-sm text-fg-muted">
        <span className="flex justify-between">
          Background opacity
          <span className="text-fg tabular-nums">
            {appearance.backgroundOpacity}%
          </span>
        </span>
        <input
          type="range"
          aria-label="Background opacity"
          aria-valuetext={`${appearance.backgroundOpacity}%`}
          min={0}
          max={100}
          step={5}
          value={appearance.backgroundOpacity}
          onChange={(event) =>
            set({ backgroundOpacity: Number(event.target.value) })
          }
          className="accent-accent"
        />
      </label>
      <ChoiceRow
        label="Text shadow"
        value={appearance.textShadow}
        options={subtitleTextShadows.map((shadow) => ({
          value: shadow,
          label: textShadowNames[shadow],
        }))}
        onChange={(textShadow) => set({ textShadow })}
      />
      <ChoiceRow
        label="Text size"
        value={String(appearance.textSizeStep)}
        options={subtitleTextScales.map((scale, step) => ({
          value: String(step),
          label: `${Math.round(scale * 100)}%`,
        }))}
        onChange={(step) => set({ textSizeStep: Number(step) })}
      />
      <ChoiceRow
        label="Text color"
        value={appearance.textColor}
        options={swatchOptions(textColorNames, (color) => ({
          backgroundColor: textColors[color],
        }))}
        onChange={(textColor) => set({ textColor })}
        isPlain
      />
    </div>
  );
}

/**
 * A line of subtitles in the chosen appearance, docked at the foot of a small picture with light and dark parts.
 * The picture keeps a video's proportions at a fixed width, since the text grows with the picture's width as it does over the video.
 */
function Preview({ appearance }: { appearance: SubtitleAppearance }) {
  const styles = subtitleBoxStyles(appearance, { target: 1, translation: 0 });
  // The box may grow past one line, since the line wraps at the larger sizes in so small a picture.
  const { height, ...boxStyle } = styles.box;
  return (
    <div
      aria-hidden
      data-testid="subtitle-preview-picture"
      className="@container mx-auto flex aspect-video w-full max-w-xs flex-col justify-end overflow-hidden rounded-md bg-linear-to-br from-sky-800 via-slate-500 to-amber-200"
    >
      <div
        data-testid="subtitle-preview"
        style={{
          ...boxStyle,
          minHeight: height,
          ...subtitleBackdropStyles(appearance).backdrop,
        }}
        className="flex items-center justify-center px-3 text-center"
      >
        <p style={styles.target} className="font-medium">
          Subtitles look like this.
        </p>
      </div>
    </div>
  );
}

/** Swatches named after their colors, each filled with the style that `swatchStyle` gives its color. */
function swatchOptions<Color extends string>(
  names: Record<Color, string>,
  swatchStyle: (color: Color) => CSSProperties,
) {
  return (Object.keys(names) as Color[]).map((color) => ({
    value: color,
    label: (
      <span className="flex flex-col items-center gap-1 text-xs">
        <span
          className="size-8 rounded-full border border-line-strong"
          style={swatchStyle(color)}
          aria-hidden
        />
        {names[color]}
      </span>
    ),
  }));
}
