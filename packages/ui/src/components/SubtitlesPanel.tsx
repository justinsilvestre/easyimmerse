import { useParseTimedTextMutation } from "@easyimmerse/backend";
import { actions, selectSubtitleSource } from "@easyimmerse/state";
import type { Cue } from "@easyimmerse/types";
import { useEffect } from "react";
import { fixtureSubtitleText } from "../fixtureSubtitle.ts";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { Button } from "./Button.tsx";

/** Shares the parsed subtitles between the panel and the waveform, which draws the cues. */
export const subtitlesCacheKey = "mediaScreenSubtitles";

/** The cues of the subtitles the panel has parsed, or none yet. */
export function useParsedCues(): readonly Cue[] {
  const [, { data }] = useParseTimedTextMutation({
    fixedCacheKey: subtitlesCacheKey,
  });
  return data?.cues ?? [];
}

/** Parses the chosen subtitle file, or the fixture until one is chosen, and lists its cues. */
export function SubtitlesPanel() {
  const subtitleSource = useAppSelector(selectSubtitleSource);
  const [parseTimedText, { data, error }] = useParseTimedTextMutation({
    fixedCacheKey: subtitlesCacheKey,
  });
  useEffect(() => {
    parseTimedText({
      source: subtitleSource ?? { kind: "inline", text: fixtureSubtitleText },
      format: null,
    });
  }, [subtitleSource, parseTimedText]);
  if (error) return <p role="alert">Could not parse the subtitles.</p>;
  return (
    <ol aria-label="Subtitles" className="flex flex-col gap-1">
      {(data?.cues ?? []).map((cue) => (
        <CueItem key={cue.index} cue={cue} />
      ))}
    </ol>
  );
}

function CueItem({ cue }: { cue: Cue }) {
  const dispatch = useAppDispatch();
  return (
    <li className="flex items-center gap-2">
      <Button
        variant="subtle"
        className="whitespace-pre-line text-left"
        onClick={() => dispatch(actions.seekRequested(cue.start_ms / 1000))}
      >
        {cue.text}
      </Button>
      <Button
        aria-label={`Copy cue ${cue.index}`}
        onClick={() => dispatch(actions.cueCopyRequested(cue.text))}
      >
        Copy
      </Button>
    </li>
  );
}
