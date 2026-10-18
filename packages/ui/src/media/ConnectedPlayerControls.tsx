import type { ComponentProps } from "react";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { PlayerControls } from "./PlayerControls.tsx";
import { selectMediaPlayback } from "./selectMediaPlayback.ts";

/**
 * The player's controls, showing the store's playback.
 * They read the playback themselves, so that the player's time moving renders only them and not the screen around them.
 */
export function ConnectedPlayerControls(
  props: Omit<ComponentProps<typeof PlayerControls>, "playback">,
) {
  const playback = useAppSelector(selectMediaPlayback);
  return <PlayerControls playback={playback} {...props} />;
}
