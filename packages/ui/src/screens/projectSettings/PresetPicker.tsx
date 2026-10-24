import type { FlashcardFieldKey } from "@easyimmerse/types";
import clsx from "clsx";
import { type ReactNode, useState } from "react";
import { SegmentedControl } from "../../components/common/SegmentedControl.tsx";
import { useMediaQuery } from "../../lib/useMediaQuery.ts";
import {
  type FlashcardPreset,
  flashcardPresetOptions,
  presetMatching,
} from "./flashcardPresets.ts";

/** The width from which the field checkboxes stand beside each other, matching Tailwind's `sm` breakpoint. */
const roomyScreenQuery = "(min-width: 40rem)";

const customOption = { value: "custom", label: "Custom" } as const;

/**
 * The flashcard presets, with the field checkboxes under them. A preset sets both the fields and which of them are on the front.
 * On a roomy screen the checkboxes are always shown and "Custom" appears only once the selection matches no preset.
 * On a narrow screen the checkboxes stay hidden until "Custom" is chosen, which then shows as the preset.
 */
export function PresetPicker({
  fields,
  frontFields,
  onPresetChosen,
  children,
}: {
  fields: readonly FlashcardFieldKey[];
  frontFields: readonly FlashcardFieldKey[];
  onPresetChosen: (preset: FlashcardPreset) => void;
  /** The field checkboxes and the controls that put fields on the front or the back. */
  children: ReactNode;
}) {
  const isRoomy = useMediaQuery(roomyScreenQuery);
  const [isCustomOpen, setCustomOpen] = useState(false);
  const matching = presetMatching(fields, frontFields);
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
