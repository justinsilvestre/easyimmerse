import type { WordHover } from "@easyimmerse/state";
import { selectSubtitles } from "@easyimmerse/state";
import type { Cue, SubtitleRole } from "@easyimmerse/types";
import clsx from "clsx";
import { type ReactNode, useRef } from "react";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { usePlayerFullscreen } from "../hooks/usePlayerFullscreen.ts";
import { usePlayerKeyboardShortcuts } from "../hooks/usePlayerKeyboardShortcuts.ts";
import { MediaPlayer } from "./MediaPlayer.tsx";
import { PlayerControls } from "./PlayerControls.tsx";
import { SubtitlesOverlay } from "./SubtitlesOverlay.tsx";
import { SubtitlesPanel } from "./SubtitlesPanel.tsx";

/**
 * The player with its subtitles overlay, controls, and subtitles panel, operable from the keyboard while focused.
 * The panel sits beside a video, or below it on narrow screens, and above audio. Fullscreen shows only the player.
 */
export function MediaView({
  kind,
  name,
  src,
  targetCues,
  translationCues,
  onWordActivated,
  onAddSubtitles,
  onGenerateSubtitles,
}: {
  kind: "video" | "audio";
  /** The name of the media file, used in messages about it. */
  name: string;
  src: string;
  targetCues: readonly Cue[] | null;
  translationCues: readonly Cue[] | null;
  onWordActivated: (hover: WordHover) => void;
  onAddSubtitles: (role: SubtitleRole) => void;
  onGenerateSubtitles: () => void;
}) {
  const viewRef = useRef<HTMLElement>(null);
  const panelOpen = useAppSelector((state) => selectSubtitles(state).panelOpen);
  const { isFullscreen, toggleFullscreen } = usePlayerFullscreen(viewRef);
  const handleKeyDown = usePlayerKeyboardShortcuts(
    targetCues,
    toggleFullscreen,
  );
  const panel = panelOpen && !isFullscreen && (
    <MediaViewPanelDock kind={kind}>
      <SubtitlesPanel
        cues={targetCues}
        onAddSubtitles={onAddSubtitles}
        onGenerateSubtitles={onGenerateSubtitles}
      />
    </MediaViewPanelDock>
  );
  return (
    <section
      ref={viewRef}
      // The view takes focus so that its keyboard shortcuts work after clicking anywhere in it.
      // biome-ignore lint/a11y/noNoninteractiveTabindex: see above.
      tabIndex={0}
      aria-label="Player"
      onKeyDown={handleKeyDown}
      className={clsx(
        "group/view flex bg-neutral-950 text-neutral-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset",
        kind === "video" ? "flex-col md:flex-row" : "flex-col",
      )}
    >
      {kind === "audio" && panel}
      <div className="flex min-w-0 flex-1 flex-col">
        <MediaPlayer kind={kind} name={name} src={src}>
          <SubtitlesOverlay
            targetCues={targetCues}
            translationCues={translationCues}
            onWordActivated={onWordActivated}
          />
        </MediaPlayer>
        <PlayerControls cues={targetCues} fullscreenTarget={viewRef} />
      </div>
      {kind === "video" && panel}
    </section>
  );
}

function MediaViewPanelDock({
  kind,
  children,
}: {
  kind: "video" | "audio";
  children: ReactNode;
}) {
  return (
    <aside
      aria-label="Subtitles panel"
      className={clsx(
        "relative border-white/10 bg-neutral-950",
        kind === "video"
          ? "h-72 border-t md:h-auto md:w-80 md:shrink-0 md:border-t-0 md:border-l"
          : "h-56 border-b",
      )}
    >
      <div className="absolute inset-0">{children}</div>
    </aside>
  );
}
