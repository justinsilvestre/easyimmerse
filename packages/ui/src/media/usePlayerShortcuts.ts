import type { RefObject } from "react";
import { useKeyboardShortcut } from "../hooks/useKeyboardShortcut.ts";
import type { PlayerCallbacks } from "./PlayerControls.tsx";

export type PlayerShortcutCallbacks = Pick<
  PlayerCallbacks,
  "onTogglePlay" | "onSkip" | "onToggleMute"
> & {
  /** Plays the cue shown now again from its start, or the last few seconds between cues. */
  onReplay: () => void;
};

/**
 * The keys that work the player while its screen is in reach:
 * Space or K plays and pauses, the left and right arrows skip to the previous and next cue, R replays the cue shown now, and M mutes and unmutes.
 * J and L are left alone, since L opens the dictionary lookup.
 */
export function usePlayerShortcuts(
  callbacks: PlayerShortcutCallbacks,
  scopeRef: RefObject<Element | null>,
): void {
  useKeyboardShortcut([" ", "k"], callbacks.onTogglePlay, scopeRef);
  useKeyboardShortcut("ArrowLeft", () => callbacks.onSkip("back"), scopeRef);
  useKeyboardShortcut(
    "ArrowRight",
    () => callbacks.onSkip("forward"),
    scopeRef,
  );
  useKeyboardShortcut("r", callbacks.onReplay, scopeRef);
  useKeyboardShortcut("m", callbacks.onToggleMute, scopeRef);
}
