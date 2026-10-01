import { actions, selectPlayer } from "@easyimmerse/state";
import type { Cue } from "@easyimmerse/types";
import type { KeyboardEvent } from "react";
import { useAppDispatch } from "./useAppDispatch.ts";
import { useAppStore } from "./useAppStore.ts";
import { usePlayerSkip } from "./usePlayerSkip.ts";

const volumeStep = 0.1;

/**
 * Returns a keydown handler for the player's container. Space toggles playback, the left and right arrows skip,
 * the up and down arrows change the volume, F toggles fullscreen, S the subtitles panel, and T the overlaid subtitles.
 * Keys meant for a focused form control or button are left to it.
 */
export function usePlayerKeyboardShortcuts(
  cues: readonly Cue[] | null,
  toggleFullscreen: () => void,
) {
  const dispatch = useAppDispatch();
  const store = useAppStore();
  const skip = usePlayerSkip(cues);
  const changeVolume = (delta: number) => {
    const { volume } = selectPlayer(store.getState());
    dispatch(actions.volumeChanged(Math.round((volume + delta) * 100) / 100));
  };
  const shortcuts: Record<string, () => void> = {
    " ": () => dispatch(actions.togglePlayRequested()),
    ArrowLeft: () => skip("previous"),
    ArrowRight: () => skip("next"),
    ArrowUp: () => changeVolume(volumeStep),
    ArrowDown: () => changeVolume(-volumeStep),
    f: toggleFullscreen,
    s: () => dispatch(actions.subtitlesPanelToggled()),
    t: () => dispatch(actions.subtitleOverlayToggled()),
  };
  return (event: KeyboardEvent<HTMLElement>) => {
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    const shortcut = shortcuts[key];
    if (shortcut === undefined || isMeantForOtherHandler(event)) return;
    event.preventDefault();
    shortcut();
  };
}

function isMeantForOtherHandler(event: KeyboardEvent<HTMLElement>): boolean {
  if (event.altKey || event.ctrlKey || event.metaKey) return true;
  const { target } = event;
  if (!(target instanceof HTMLElement)) return false;
  if (target.closest("input, select, textarea, [contenteditable]")) return true;
  return event.key === " " && target.closest("button") !== null;
}
