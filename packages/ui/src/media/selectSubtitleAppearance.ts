import { selectPreference } from "@easyimmerse/state";
import { createSelector } from "reselect";
import { parseSubtitleAppearance } from "./subtitleAppearance.ts";

/** Returns how the subtitles over the video look, as stored, keeping its reference while the stored value does. */
export const selectSubtitleAppearance = createSelector(
  [selectPreference("subtitleAppearance")],
  parseSubtitleAppearance,
);
