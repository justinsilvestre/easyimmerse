import { selectCurrentTimeMs } from "@easyimmerse/state";
import type { Cue, SubtitleRole } from "@easyimmerse/types";
import { useRef } from "react";
import { findCueAt } from "../cues/findCueAt.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { useCurrentCueInView } from "../hooks/useCurrentCueInView.ts";
import { SubtitlesPanelCard } from "./SubtitlesPanelCard.tsx";
import { SubtitlesPanelEmpty } from "./SubtitlesPanelEmpty.tsx";

/**
 * Lists the cues as cards, highlighting the cue at the player's current time and keeping it in view.
 * Clicking a card seeks to its cue. Without cues, offers adding or generating subtitles.
 */
export function SubtitlesPanel({
  cues,
  onAddSubtitles,
  onGenerateSubtitles,
}: {
  cues: readonly Cue[] | null;
  onAddSubtitles: (role: SubtitleRole) => void;
  onGenerateSubtitles: () => void;
}) {
  if (cues === null || cues.length === 0)
    return (
      <SubtitlesPanelEmpty
        onAddSubtitles={onAddSubtitles}
        onGenerateSubtitles={onGenerateSubtitles}
      />
    );
  return <SubtitlesPanelCueList cues={cues} />;
}

function SubtitlesPanelCueList({ cues }: { cues: readonly Cue[] }) {
  const timeMs = useAppSelector(selectCurrentTimeMs);
  const currentCue = findCueAt(cues, timeMs);
  const listRef = useRef<HTMLOListElement>(null);
  const scrollHandlers = useCurrentCueInView(listRef, currentCue);
  return (
    <ol
      ref={listRef}
      aria-label="Subtitles"
      // The list is positioned so that its items' offsets are measured from it.
      className="relative flex h-full flex-col gap-1 overflow-y-auto p-2"
      {...scrollHandlers}
    >
      {cues.map((cue) => (
        <SubtitlesPanelCard
          key={cue.index}
          cue={cue}
          isCurrent={cue === currentCue}
        />
      ))}
    </ol>
  );
}
