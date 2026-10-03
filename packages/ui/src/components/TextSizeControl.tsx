import { actions, selectTextSize, textSizes } from "@easyimmerse/state";
import { useContext } from "react";
import { AppFeaturesContext } from "../appFeaturesContext.ts";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { SegmentedControl } from "./SegmentedControl.tsx";

const sizeLabels = { small: "Small", medium: "Medium", large: "Large" };

/** Lets the user pick the size of the app's text. Renders nothing on platforms that leave zooming to the browser. */
export function TextSizeControl() {
  const dispatch = useAppDispatch();
  const textSize = useAppSelector(selectTextSize);
  const { hasTextSizeControl } = useContext(AppFeaturesContext);
  if (!hasTextSizeControl) return null;
  return (
    <span className="flex items-center gap-2 text-xs text-fg-muted">
      Text size
      <SegmentedControl
        label="Text size"
        size="sm"
        options={textSizes.map((size) => ({
          value: size,
          label: sizeLabels[size],
        }))}
        value={textSize}
        onChange={(size) => dispatch(actions.textSizeChosen(size))}
      />
    </span>
  );
}
