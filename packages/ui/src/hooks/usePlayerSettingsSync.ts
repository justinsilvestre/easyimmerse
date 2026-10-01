import { selectPlayer } from "@easyimmerse/state";
import { type RefObject, useEffect } from "react";
import { useAppSelector } from "./useAppSelector.ts";

/** Keeps the media element's playback rate and volume equal to the store's. */
export function usePlayerSettingsSync(
  media: RefObject<HTMLMediaElement | null>,
) {
  const playbackRate = useAppSelector(
    (state) => selectPlayer(state).playbackRate,
  );
  const volume = useAppSelector((state) => selectPlayer(state).volume);
  useEffect(() => {
    if (media.current !== null) media.current.playbackRate = playbackRate;
  }, [media, playbackRate]);
  useEffect(() => {
    if (media.current !== null) media.current.volume = volume;
  }, [media, volume]);
}
