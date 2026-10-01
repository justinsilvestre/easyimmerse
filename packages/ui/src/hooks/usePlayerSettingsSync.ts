import { selectPlayer } from "@easyimmerse/state";
import { useEffect } from "react";
import { useAppSelector } from "./useAppSelector.ts";

/** Keeps the media element's playback rate and volume equal to the store's. */
export function usePlayerSettingsSync(element: HTMLMediaElement | null) {
  const playbackRate = useAppSelector(
    (state) => selectPlayer(state).playbackRate,
  );
  const volume = useAppSelector((state) => selectPlayer(state).volume);
  useEffect(() => {
    if (element !== null) element.playbackRate = playbackRate;
  }, [element, playbackRate]);
  useEffect(() => {
    if (element !== null) element.volume = volume;
  }, [element, volume]);
}
