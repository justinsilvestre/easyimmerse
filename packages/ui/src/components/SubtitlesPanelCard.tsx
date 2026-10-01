import { actions } from "@easyimmerse/state";
import type { Cue } from "@easyimmerse/types";
import clsx from "clsx";
import { stripCueMarkup } from "../cues/stripCueMarkup.ts";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { formatMediaTime } from "./formatMediaTime.ts";

/** A list item showing a cue's start time and text, which seeks to the cue when clicked. */
export function SubtitlesPanelCard({
  cue,
  isCurrent,
}: {
  cue: Cue;
  isCurrent: boolean;
}) {
  const dispatch = useAppDispatch();
  return (
    <li>
      <button
        type="button"
        aria-current={isCurrent || undefined}
        onClick={() => dispatch(actions.momentSeekRequested(cue.start_ms))}
        className={clsx(
          "flex w-full flex-col gap-0.5 rounded-md px-3 py-2 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400",
          isCurrent
            ? "bg-blue-500/20 text-white ring-1 ring-blue-400/50"
            : "text-neutral-300 hover:bg-white/5 hover:text-white",
        )}
      >
        <span className="text-xs text-neutral-400 tabular-nums">
          {formatMediaTime(cue.start_ms)}
        </span>
        <span className="whitespace-pre-line text-sm leading-snug">
          {stripCueMarkup(cue.text)}
        </span>
      </button>
    </li>
  );
}
