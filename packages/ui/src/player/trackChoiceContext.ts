import { createContext, useContext } from "react";

/**
 * Lets the player tell its screen how to open the track choice dialog, or that there is nothing to choose,
 * so that the screen can offer a Tracks button among the player controls.
 */
export const TrackChoiceContext = createContext<
  (openTrackChoice: (() => void) | null) => void
>(() => undefined);

export function useOfferTrackChoice() {
  return useContext(TrackChoiceContext);
}
