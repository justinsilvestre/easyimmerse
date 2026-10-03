import { selectTextSize } from "@easyimmerse/state";
import { useLayoutEffect } from "react";
import { useAppSelector } from "./useAppSelector.ts";

/** Marks the document with the chosen text size, so that the stylesheet scales the page's root font size. */
export function useApplyTextSize() {
  const textSize = useAppSelector(selectTextSize);
  useLayoutEffect(() => {
    document.documentElement.dataset.textSize = textSize;
  }, [textSize]);
}
