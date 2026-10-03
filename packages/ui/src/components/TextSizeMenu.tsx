import {
  actions,
  defaultTextScale,
  largerTextScale,
  selectTextScale,
  smallerTextScale,
  textScales,
} from "@easyimmerse/state";
import { ChevronDown, Minus, Plus, Type } from "lucide-react";
import { useContext, useId, useRef, useState } from "react";
import { AppFeaturesContext } from "../appFeaturesContext.ts";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { Button } from "./Button.tsx";
import { IconButton } from "./IconButton.tsx";

const smallest = textScales[0];
const largest = textScales[textScales.length - 1];

/**
 * A button in the footer that opens a small panel for the size of the app's text, with steps in both directions and a way back to the default.
 * Renders nothing on platforms that leave zooming to the browser.
 */
export function TextSizeMenu() {
  const dispatch = useAppDispatch();
  const scale = useAppSelector(selectTextScale);
  const { hasTextSizeControl } = useContext(AppFeaturesContext);
  const [isOpen, setOpen] = useState(false);
  const panelId = useId();
  const ref = useRef<HTMLDivElement>(null);
  if (!hasTextSizeControl) return null;
  const choose = (next: number) => dispatch(actions.textScaleChosen(next));
  return (
    // The handlers only close the panel; the buttons inside are the interactive elements.
    // biome-ignore lint/a11y/noStaticElementInteractions: see above
    <div
      ref={ref}
      className="relative"
      onBlur={(event) => {
        if (!ref.current?.contains(event.relatedTarget as Node | null))
          setOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") setOpen(false);
      }}
    >
      <Button
        size="sm"
        variant="subtle"
        aria-expanded={isOpen}
        aria-controls={isOpen ? panelId : undefined}
        onClick={() => setOpen(!isOpen)}
      >
        <Type className="size-3.5" aria-hidden />
        Text size
        <ChevronDown className="size-3" aria-hidden />
      </Button>
      {isOpen && (
        <fieldset
          id={panelId}
          aria-label="Text size"
          className="absolute right-0 bottom-full z-20 mb-1 flex items-center gap-1 rounded-md border border-line bg-surface p-1 shadow-lg"
        >
          <IconButton
            label="Smaller text"
            disabled={scale === smallest}
            onClick={() => choose(smallerTextScale(scale))}
          >
            <Minus className="size-4" />
          </IconButton>
          <output
            aria-label="Current text size"
            className="w-12 text-center text-sm tabular-nums"
          >
            {scale}%
          </output>
          <IconButton
            label="Larger text"
            disabled={scale === largest}
            onClick={() => choose(largerTextScale(scale))}
          >
            <Plus className="size-4" />
          </IconButton>
          <Button
            size="sm"
            variant="subtle"
            disabled={scale === defaultTextScale}
            onClick={() => choose(defaultTextScale)}
          >
            Reset
          </Button>
        </fieldset>
      )}
    </div>
  );
}
