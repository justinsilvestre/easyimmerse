import { defaultTextScale, selectTextScale } from "@easyimmerse/state";
import { useLayoutEffect } from "react";
import { useAppSelector } from "./useAppSelector.ts";

/** Sets the document's root font size to the chosen scale, so that every measurement in rem follows the text. */
export function useApplyTextScale() {
  const scale = useAppSelector(selectTextScale);
  useLayoutEffect(() => {
    document.documentElement.style.fontSize =
      scale === defaultTextScale ? "" : `${scale}%`;
  }, [scale]);
}
