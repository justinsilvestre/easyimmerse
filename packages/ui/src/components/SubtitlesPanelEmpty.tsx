import type { SubtitleRole } from "@easyimmerse/types";
import type { ComponentProps } from "react";
import { useId } from "react";

/** Offers adding a subtitles file for either role, and generating subtitles once that becomes available. */
export function SubtitlesPanelEmpty({
  onAddSubtitles,
  onGenerateSubtitles,
}: {
  onAddSubtitles: (role: SubtitleRole) => void;
  onGenerateSubtitles: () => void;
}) {
  const generateHintId = useId();
  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto p-4 text-sm text-neutral-300">
      <p>This media has no subtitles yet.</p>
      <SubtitlesPanelEmptyButton onClick={() => onAddSubtitles("target")}>
        Add target-language subtitles
      </SubtitlesPanelEmptyButton>
      <SubtitlesPanelEmptyButton onClick={() => onAddSubtitles("translation")}>
        Add translation subtitles
      </SubtitlesPanelEmptyButton>
      <SubtitlesPanelEmptyButton
        disabled
        aria-describedby={generateHintId}
        onClick={onGenerateSubtitles}
      >
        Generate subtitles
      </SubtitlesPanelEmptyButton>
      <p id={generateHintId} className="text-xs text-neutral-500">
        Generating subtitles needs a speech-to-text plugin or a subscription,
        which are not available yet.
      </p>
    </div>
  );
}

function SubtitlesPanelEmptyButton(props: ComponentProps<"button">) {
  return (
    <button
      type="button"
      className="rounded-md border border-white/15 px-3 py-2 text-left text-neutral-100 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
      {...props}
    />
  );
}
