import { useParseTimedTextMutation } from "@easyimmerse/backend";
import type { ChosenFile } from "@easyimmerse/state";
import { actions, selectChosenFile, selectPlayer } from "@easyimmerse/state";
import type { SubtitleRole } from "@easyimmerse/types";
import { useEffect } from "react";
import { Button } from "../components/Button.tsx";
import { MediaView } from "../components/MediaView.tsx";
import { PickFileButton } from "../components/PickFileButton.tsx";
import { PreferenceToggle } from "../components/PreferenceToggle.tsx";
import { fixtureSubtitleText } from "../fixtureSubtitle.ts";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";

export function MediaScreen({
  projectId,
  onBack,
}: {
  projectId: string;
  onBack: () => void;
}) {
  const dispatch = useAppDispatch();
  const { cues, failed } = useChosenOrFixtureCues();
  const mediaUrl = useAppSelector((state) => selectPlayer(state).mediaUrl);
  const addSubtitles = (role: SubtitleRole) =>
    dispatch(actions.filePickRequested({ kind: "subtitles", role }));
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-4 p-4">
      <header className="flex items-center justify-between">
        <Button onClick={onBack}>Back</Button>
        <h1 className="text-xl font-semibold">Project {projectId}</h1>
      </header>
      <div className="flex items-center gap-4">
        <PickFileButton />
        <PreferenceToggle />
      </div>
      {failed && <p role="alert">Could not parse the subtitles.</p>}
      <MediaView
        kind="video"
        src={mediaUrl ?? ""}
        targetCues={cues}
        translationCues={null}
        onWordActivated={() => undefined}
        onAddSubtitles={addSubtitles}
        onGenerateSubtitles={() => undefined}
      />
    </main>
  );
}

/** Parses the chosen subtitle file, or the fixture until one is chosen. */
function useChosenOrFixtureCues() {
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
  return { cues: data?.cues ?? null, failed: error !== undefined };
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
