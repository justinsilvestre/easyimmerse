import { useState } from "react";

/** Where a pop-up stands beside its word: the side of the word, and its edges and width as inline styles. */
export type PopupPlace = {
  side: "above" | "below";
  top: number | string;
  bottom: number | string;
  left: number | string;
  width?: string;
};

/**
 * Whether a pop-up should glide to the place it stands at now, rather than appear there at once.
 * It glides only from a place on the same side of a word:
 * its first place, and a move to the other side, where its top and bottom edges would both travel, take effect at once.
 */
export function useIsGliding(place: PopupPlace | null): boolean {
  const key = place && JSON.stringify(place);
  const [shown, setShown] = useState({
    key,
    side: place?.side,
    isGliding: false,
  });
  if (shown.key === key) return shown.isGliding;
  const isGliding = place !== null && shown.side === place.side;
  setShown({ key, side: place?.side, isGliding });
  return isGliding;
}
