import { actions } from "@easyimmerse/state";
import { useId } from "react";
import { Button } from "../components/Button.tsx";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { SubtitleAppearanceControls } from "./SubtitleAppearanceControls.tsx";
import { selectSubtitleAppearance } from "./selectSubtitleAppearance.ts";
import {
  defaultSubtitleAppearance,
  type SubtitleAppearance,
} from "./subtitleAppearance.ts";

/**
 * The Subtitles section of Settings, which sets how the subtitles over the video look
 * with the same preview and controls as the subtitle appearance dialog, and keeps the choice as a preference.
 */
export function SubtitleAppearanceSection() {
  const headingId = useId();
  const dispatch = useAppDispatch();
  const appearance = useAppSelector(selectSubtitleAppearance);
  const onChange = (changed: SubtitleAppearance) =>
    dispatch(
      actions.preferenceSet("subtitleAppearance", JSON.stringify(changed)),
    );
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <h2 id={headingId} className="text-base font-semibold">
        Subtitles
      </h2>
      <div className="flex max-w-lg flex-col gap-4">
        <SubtitleAppearanceControls
          appearance={appearance}
          onChange={onChange}
        />
        <Button
          variant="subtle"
          className="self-end"
          onClick={() => onChange(defaultSubtitleAppearance)}
        >
          Restore defaults
        </Button>
      </div>
    </section>
  );
}
