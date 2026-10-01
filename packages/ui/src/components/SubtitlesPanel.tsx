import { useParseTimedTextMutation } from "@easyimmerse/backend";
import type { ChosenFile } from "@easyimmerse/state";
import { actions, selectChosenFile } from "@easyimmerse/state";
import type { Cue } from "@easyimmerse/types";
import { useEffect } from "react";
import { fixtureSubtitleText } from "../fixtureSubtitle.ts";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { Button } from "./Button.tsx";

/** Parses the chosen subtitle file, or the fixture until one is chosen, and lists its cues. */
export function SubtitlesPanel() {
  const subtitlePath = readSubtitlePath(useAppSelector(selectChosenFile));
  const [parseTimedText, { data, error }] = useParseTimedTextMutation();
  useEffect(() => {
    parseTimedText({
      source:
        subtitlePath === null
          ? { kind: "inline", text: fixtureSubtitleText }
          : { kind: "path", path: subtitlePath },
      format: null,
    });
  }, [subtitlePath, parseTimedText]);
  if (error) return <p role="alert">Could not parse the subtitles.</p>;
  return (
    <ol aria-label="Subtitles" className="flex flex-col gap-1">
      {(data?.cues ?? []).map((cue) => (
        <CueItem key={cue.index} cue={cue} />
      ))}
    </ol>
  );
}

/**
 * Returns the path of a subtitle file picked in the native app.
 * A file picked in the web app is stored in the browser, which the server cannot read,
 * so the fixture stays shown.
 */
function readSubtitlePath(chosen: ChosenFile | null): string | null {
  if (chosen?.purpose.kind !== "subtitles") return null;
  const { source } = chosen.file;
  return source.kind === "path" ? source.path : null;
}

function CueItem({ cue }: { cue: Cue }) {
  const dispatch = useAppDispatch();
  return (
    <li className="flex items-center gap-2">
      <Button
        variant="subtle"
        className="whitespace-pre-line text-left"
        onClick={() => dispatch(actions.seekRequested(cue.start_ms))}
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
