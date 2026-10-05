import { useState } from "react";
import { Badge } from "../components/Badge.tsx";
import { Button } from "../components/Button.tsx";
import { ModalDialog } from "../components/ModalDialog.tsx";
import { languageName } from "../projects/languages.ts";
import type { TrackOption } from "./playback.ts";

/** Asks which of several subtitle tracks to show when none is alone in the wanted language. */
export function TrackPickerDialog({
  purpose,
  tracks,
  wantedLanguage,
  onChoose,
  onSkip,
}: {
  purpose: "targetSubtitles" | "translationSubtitles";
  tracks: readonly TrackOption[];
  wantedLanguage: string;
  onChoose: (trackId: string) => void;
  onSkip: () => void;
}) {
  const [chosenId, setChosenId] = useState<string | null>(
    tracks.find((track) => track.language === wantedLanguage)?.id ?? null,
  );
  return (
    <ModalDialog
      title={titles[purpose]}
      description={descriptions[purpose]}
      onCancel={onSkip}
      footer={
        <>
          <Button onClick={onSkip}>Skip</Button>
          <Button
            variant="primary"
            disabled={chosenId === null}
            onClick={() => chosenId && onChoose(chosenId)}
          >
            Use this track
          </Button>
        </>
      }
    >
      <fieldset className="flex flex-col gap-1.5">
        <legend className="sr-only">Tracks</legend>
        {tracks.map((track) => (
          <label
            key={track.id}
            className="flex cursor-pointer items-start gap-3 rounded-md border border-line px-3 py-2 text-sm has-checked:border-accent has-checked:bg-accent-soft"
          >
            <input
              type="radio"
              name="track"
              value={track.id}
              checked={chosenId === track.id}
              onChange={() => setChosenId(track.id)}
              className="mt-1 accent-accent"
            />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="flex items-center gap-2">
                <span className="flex-1">{track.label}</span>
                {track.language && (
                  <Badge
                    tone={
                      track.language === wantedLanguage ? "accent" : "neutral"
                    }
                  >
                    {languageName(track.language)}
                  </Badge>
                )}
              </span>
              {track.sample && (
                <span className="line-clamp-2 text-xs whitespace-pre-line text-fg-muted">
                  {track.sample}
                </span>
              )}
            </span>
          </label>
        ))}
      </fieldset>
    </ModalDialog>
  );
}

const titles = {
  targetSubtitles: "Which subtitles should be shown?",
  translationSubtitles: "Which subtitles are the translation?",
};

const descriptions = {
  targetSubtitles:
    "The file has several subtitle tracks. Words in the one you choose can be looked up.",
  translationSubtitles:
    "Choose the subtitles to show under the ones you are learning from, or skip to go without a translation.",
};
