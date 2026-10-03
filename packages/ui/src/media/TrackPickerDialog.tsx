import { useState } from "react";
import { Badge } from "../components/Badge.tsx";
import { Button } from "../components/Button.tsx";
import { Dialog } from "../components/Dialog.tsx";
import { languageName } from "../projects/languages.ts";
import type { TrackOption } from "./playback.ts";

/** Asks which of several tracks to use when none is alone in the wanted language. */
export function TrackPickerDialog({
  purpose,
  tracks,
  wantedLanguage,
  onChoose,
  onSkip,
}: {
  purpose: "audio" | "targetSubtitles" | "translationSubtitles";
  tracks: readonly TrackOption[];
  wantedLanguage: string;
  onChoose: (trackId: string) => void;
  onSkip: () => void;
}) {
  const [chosenId, setChosenId] = useState<string | null>(
    tracks.find((track) => track.language === wantedLanguage)?.id ?? null,
  );
  const noun = purpose === "audio" ? "audio track" : "subtitles";
  return (
    <Dialog
      title={`Which ${noun} are in ${languageName(wantedLanguage)}?`}
      description={descriptions[purpose]}
      onClose={onSkip}
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
            className="flex cursor-pointer items-center gap-3 rounded-md border border-line px-3 py-2 text-sm has-checked:border-accent has-checked:bg-accent-soft"
          >
            <input
              type="radio"
              name="track"
              value={track.id}
              checked={chosenId === track.id}
              onChange={() => setChosenId(track.id)}
              className="accent-accent"
            />
            <span className="flex-1">{track.label}</span>
            {track.language && (
              <Badge
                tone={track.language === wantedLanguage ? "accent" : "neutral"}
              >
                {languageName(track.language)}
              </Badge>
            )}
          </label>
        ))}
      </fieldset>
    </Dialog>
  );
}

const descriptions = {
  audio:
    "The file has several audio tracks. Lookups and flashcard audio use the one you choose.",
  targetSubtitles:
    "The file has several subtitle tracks. Words in the chosen one can be looked up.",
  translationSubtitles:
    "Choose the subtitles to show as the translation, or skip to go without one.",
};
