import clsx from "clsx";
import type { ReactNode } from "react";
import { ReaderToolbarButton } from "./ReaderToolbarButton.tsx";
import type {
  ReaderFontFamily,
  ReaderFontSize,
  ReaderSettings,
} from "./readerSettings.ts";

const fontSizeOptions: {
  value: ReaderFontSize;
  label: string;
  className: string;
}[] = [
  { value: "small", label: "Small", className: "text-xs" },
  { value: "medium", label: "Medium", className: "text-sm" },
  { value: "large", label: "Large", className: "text-lg" },
];

const fontFamilyOptions: {
  value: ReaderFontFamily;
  label: string;
  className: string;
}[] = [
  { value: "serif", label: "Serif", className: "font-serif" },
  { value: "sans", label: "Sans", className: "font-sans" },
];

/** Segmented controls for the size and family of the reader's font. */
export function ReaderFontControls({
  settings,
  onSettingsChanged,
}: {
  settings: ReaderSettings;
  onSettingsChanged: (settings: ReaderSettings) => void;
}) {
  return (
    <div className="flex items-center gap-2 sm:ml-auto">
      <SegmentedGroup label="Font size">
        {fontSizeOptions.map((option) => (
          <ReaderToolbarButton
            key={option.value}
            aria-label={option.label}
            aria-pressed={settings.fontSize === option.value}
            isCompact
            className={clsx("font-serif", option.className)}
            onClick={() =>
              onSettingsChanged({ ...settings, fontSize: option.value })
            }
          >
            A
          </ReaderToolbarButton>
        ))}
      </SegmentedGroup>
      <SegmentedGroup label="Font">
        {fontFamilyOptions.map((option) => (
          <ReaderToolbarButton
            key={option.value}
            aria-pressed={settings.fontFamily === option.value}
            isCompact
            className={option.className}
            onClick={() =>
              onSettingsChanged({ ...settings, fontFamily: option.value })
            }
          >
            {option.label}
          </ReaderToolbarButton>
        ))}
      </SegmentedGroup>
    </div>
  );
}

function SegmentedGroup({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="inline-flex items-center gap-0.5 rounded-lg border border-stone-300 p-0.5 dark:border-stone-700">
      <legend className="sr-only">{label}</legend>
      {children}
    </fieldset>
  );
}
