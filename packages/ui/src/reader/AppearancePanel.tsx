import type { ReaderPreferences } from "@easyimmerse/state";
import clsx from "clsx";
import { AArrowDown, AArrowUp } from "lucide-react";
import { ChoiceRow } from "../components/ChoiceRow.tsx";
import { IconButton } from "../components/IconButton.tsx";
import { ReaderSheet } from "./ReaderSheet.tsx";
import {
  fontFamilies,
  fontSizePercentOf,
  fontSizesRem,
} from "./readerPreferences.ts";

type Theme = ReaderPreferences["theme"];

/** The swatch of each theme. The swatches show fixed colors, since each previews a theme other than the current one. */
const themeSwatches: Record<Theme, { label: string; className: string }> = {
  auto: {
    label: "Auto",
    className:
      "bg-[linear-gradient(135deg,var(--color-white)_50%,var(--color-gray-900)_50%)] text-gray-500",
  },
  light: { label: "Light", className: "bg-white text-gray-900" },
  sepia: { label: "Sepia", className: "bg-[#f5edda] text-[#3b2c1e]" },
  dark: { label: "Dark", className: "bg-gray-900 text-gray-100" },
};

/** The controls for how the text looks: theme, font, size, spacing, and layout. */
export function AppearancePanel({
  preferences,
  onChange,
  onClose,
}: {
  preferences: ReaderPreferences;
  onChange: (preferences: ReaderPreferences) => void;
  onClose: () => void;
}) {
  const set = (change: Partial<ReaderPreferences>) =>
    onChange({ ...preferences, ...change });
  const step = preferences.fontSizeStep;
  return (
    <ReaderSheet title="Appearance" placement="card" onClose={onClose}>
      <div className="flex flex-col gap-4 overflow-y-auto px-4 pt-2 pb-4">
        <ChoiceRow
          label="Theme"
          value={preferences.theme}
          options={(Object.keys(themeSwatches) as Theme[]).map((theme) => ({
            value: theme,
            label: (
              <span className="flex flex-col items-center gap-1 text-xs">
                <span
                  className={clsx(
                    "flex size-9 items-center justify-center rounded-full border border-line-strong font-serif text-sm",
                    themeSwatches[theme].className,
                  )}
                  aria-hidden
                >
                  Aa
                </span>
                {themeSwatches[theme].label}
              </span>
            ),
          }))}
          onChange={(theme) => set({ theme })}
          isPlain
        />
        <ChoiceRow
          label="Font"
          value={preferences.font}
          options={(["serif", "sans"] as const).map((font) => ({
            value: font,
            label: (
              <span style={{ fontFamily: fontFamilies[font] }}>
                {font === "serif" ? "Serif" : "Sans-serif"}
              </span>
            ),
          }))}
          onChange={(font) => set({ font })}
        />
        <div className="flex items-center gap-2">
          <span className="w-24 text-sm text-fg-muted">Text size</span>
          <IconButton
            label="Smaller text"
            disabled={step === 0}
            onClick={() => set({ fontSizeStep: step - 1 })}
          >
            <AArrowDown className="size-4" />
          </IconButton>
          <span className="flex-1 text-center text-sm tabular-nums">
            {fontSizePercentOf(preferences)}%
          </span>
          <IconButton
            label="Larger text"
            disabled={step === fontSizesRem.length - 1}
            onClick={() => set({ fontSizeStep: step + 1 })}
          >
            <AArrowUp className="size-4" />
          </IconButton>
        </div>
        <ChoiceRow
          label="Line spacing"
          value={preferences.lineSpacing}
          options={[
            { value: "compact", label: "Compact" },
            { value: "normal", label: "Normal" },
            { value: "relaxed", label: "Relaxed" },
          ]}
          onChange={(lineSpacing) => set({ lineSpacing })}
        />
        <ChoiceRow
          label="Line length"
          value={preferences.lineLength}
          options={[
            { value: "narrow", label: "Narrow" },
            { value: "medium", label: "Medium" },
            { value: "wide", label: "Wide" },
          ]}
          onChange={(lineLength) => set({ lineLength })}
        />
        <ChoiceRow
          label="Layout"
          value={preferences.layout}
          options={[
            { value: "pages", label: "Pages" },
            { value: "scroll", label: "Scroll" },
          ]}
          onChange={(layout) => set({ layout })}
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={preferences.isJustified}
            onChange={() => set({ isJustified: !preferences.isJustified })}
          />
          Justify and hyphenate
        </label>
      </div>
    </ReaderSheet>
  );
}
