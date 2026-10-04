import type { FlashcardFieldKey } from "@easyimmerse/types";
import clsx from "clsx";
import { type ReactNode, useState } from "react";
import { SegmentedControl } from "../components/SegmentedControl.tsx";
import {
  type FlashcardPreset,
  flashcardPresetOptions,
  presetMatching,
} from "../flashcards/flashcardPresets.ts";
import { useMediaQuery } from "../hooks/useMediaQuery.ts";

/** The width from which the field checkboxes stand beside each other, matching Tailwind's `sm` breakpoint. */
const roomyScreenQuery = "(min-width: 40rem)";

const customOption = { value: "custom", label: "Custom" } as const;

/**
 * The flashcard presets, with the field checkboxes under them.
 * On a roomy screen the checkboxes are always shown and "Custom" appears only once the selection matches no preset.
 * On a narrow screen the checkboxes stay hidden until "Custom" is chosen, which then shows as the preset.
 */
export function PresetPicker({
  fields,
  onPresetChosen,
  children,
}: {
  fields: readonly FlashcardFieldKey[];
  onPresetChosen: (preset: FlashcardPreset) => void;
  /** The field checkboxes. */
  children: ReactNode;
}) {
  const isRoomy = useMediaQuery(roomyScreenQuery);
  const [isCustomOpen, setCustomOpen] = useState(false);
  const matching = presetMatching(fields);
  const showsCustomOption = !isRoomy || matching === "custom";
  const value = !isRoomy && isCustomOpen ? "custom" : matching;
  return (
    <>
      <SegmentedControl
        label="Flashcard preset"
        options={
          showsCustomOption
            ? [...flashcardPresetOptions, customOption]
            : flashcardPresetOptions
        }
        value={value}
        onChange={(preset) => {
          if (preset === "custom") {
            setCustomOpen(true);
          } else {
            setCustomOpen(false);
            onPresetChosen(preset);
          }
        }}
      />
      <div className={clsx(!isCustomOpen && "hidden sm:block")}>{children}</div>
    </>
  );
}
