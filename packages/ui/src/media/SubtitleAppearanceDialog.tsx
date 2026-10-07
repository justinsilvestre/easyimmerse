import type { CSSProperties } from "react";
import { Button } from "../components/Button.tsx";
import { ChoiceRow } from "../components/ChoiceRow.tsx";
import { ModalDialog } from "../components/ModalDialog.tsx";
import {
  boxColorChannels,
  defaultSubtitleAppearance,
  type SubtitleAppearance,
  subtitleTextScales,
  textColors,
} from "./subtitleAppearance.ts";
import { subtitleBoxStyles } from "./subtitleBoxStyles.ts";

const boxColorNames: Record<SubtitleAppearance["boxColor"], string> = {
  black: "Black",
  grey: "Dark grey",
  white: "White",
};

const textColorNames: Record<SubtitleAppearance["textColor"], string> = {
  white: "White",
  yellow: "Yellow",
  black: "Black",
};

/**
 * The dialog where the user sets how the subtitles over the video look: the box's color and opacity,
 * and the text's shadow, size and color. Each change applies at once, to the preview and to the subtitles behind the dialog.
 */
export function SubtitleAppearanceDialog({
  appearance,
  onChange,
  onClose,
}: {
  appearance: SubtitleAppearance;
  onChange: (appearance: SubtitleAppearance) => void;
  onClose: () => void;
}) {
  const set = (change: Partial<SubtitleAppearance>) =>
    onChange({ ...appearance, ...change });
  return (
    <ModalDialog
      title="Subtitle appearance"
      onCancel={onClose}
      footer={
        <>
          <Button
            variant="subtle"
            onClick={() => onChange(defaultSubtitleAppearance)}
          >
            Restore defaults
          </Button>
          <Button variant="primary" onClick={onClose}>
            Done
          </Button>
        </>
      }
    >
      <Preview appearance={appearance} />
      <ChoiceRow
        label="Box color"
        value={appearance.boxColor}
        options={swatchOptions(boxColorNames, (color) => ({
          backgroundColor: `rgb(${boxColorChannels[color]})`,
        }))}
        onChange={(boxColor) => set({ boxColor })}
        isPlain
      />
      <label className="flex flex-col gap-1.5 text-sm text-fg-muted">
        <span className="flex justify-between">
          Box opacity
          <span className="text-fg tabular-nums">{appearance.boxOpacity}%</span>
        </span>
        <input
          type="range"
          aria-label="Box opacity"
          aria-valuetext={`${appearance.boxOpacity}%`}
          min={0}
          max={100}
          step={5}
          value={appearance.boxOpacity}
          onChange={(event) => set({ boxOpacity: Number(event.target.value) })}
          className="accent-accent"
        />
      </label>
      <ChoiceRow
        label="Text shadow"
        value={appearance.textShadow}
        options={[
          { value: "none", label: "None" },
          { value: "soft", label: "Soft" },
          { value: "strong", label: "Strong" },
        ]}
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
    </ModalDialog>
  );
}

/** A line of subtitles in the chosen appearance, over a picture with light and dark parts. */
function Preview({ appearance }: { appearance: SubtitleAppearance }) {
  const styles = subtitleBoxStyles(appearance, { target: 1, translation: 0 });
  return (
    <div
      aria-hidden
      className="@container flex flex-col overflow-hidden rounded-md bg-linear-to-br from-sky-800 via-slate-500 to-amber-200"
    >
      <div className="h-16" />
      <div
        data-testid="subtitle-preview"
        style={styles.box}
        className="flex items-center justify-center px-4 text-center"
      >
        <p style={styles.target} className="font-medium">
          Subtitles will look like this.
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
