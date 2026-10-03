import clsx from "clsx";
import { X } from "lucide-react";
import { CheckboxField } from "../components/CheckboxField.tsx";
import { TagsField } from "../components/TagsField.tsx";
import { TextField } from "../components/TextField.tsx";
import { ClipEditor } from "./ClipEditor.tsx";
import type { EditorAction, EditorState } from "./editFlashcard.ts";
import {
  type FlashcardFieldDefinition,
  type FlashcardLanguages,
  isTextField,
} from "./flashcardFields.ts";

/** The peaks of a media file's audio, each between 0 and 1, and the file's length. */
export type MediaWaveform = { peaks: readonly number[]; durationMs: number };

/**
 * One field of the flashcard editor. The audio clip and the screenshot share one waveform,
 * which is drawn with whichever of the two comes first.
 */
export function EditorField({
  field,
  state,
  languages,
  waveform,
  dispatch,
}: {
  field: FlashcardFieldDefinition;
  state: EditorState;
  languages: FlashcardLanguages;
  waveform: MediaWaveform | null;
  dispatch: (action: EditorAction) => void;
}) {
  const { content } = state;
  const { key } = field;
  const label = field.label(languages);
  if (isTextField(key)) {
    return (
      <TextField
        label={label}
        multiline={field.multiline}
        value={content[key]}
        onChange={(event) =>
          dispatch({ type: "textChanged", key, value: event.target.value })
        }
      />
    );
  }
  if (key === "tags") {
    return (
      <TagsField
        label={label}
        tags={content.tags}
        onChange={(tags) => dispatch({ type: "tagsChanged", tags })}
      />
    );
  }
  if (key === "audioContext") {
    return content.audioContext && waveform ? (
      <ClipEditor
        peaks={waveform.peaks}
        durationMs={waveform.durationMs}
        clip={content.audioContext}
        screenshotMs={content.screenshot?.atMs ?? null}
        onClipChange={(clip) => dispatch({ type: "clipChanged", clip })}
        onScreenshotMsChange={(ms) =>
          dispatch({ type: "screenshotMsChanged", ms })
        }
      />
    ) : null;
  }
  if (content.screenshot === null) return null;
  const isIncluded = state.includedFields.includes("screenshot");
  const toggle = () => dispatch({ type: "screenshotToggled" });
  return (
    <div className="flex flex-col gap-2 text-sm">
      <button
        type="button"
        aria-label="Screenshot"
        aria-pressed={isIncluded}
        onClick={toggle}
        className="relative self-start overflow-hidden rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <img
          src={content.screenshot.url}
          alt=""
          className={clsx("max-h-32", !isIncluded && "opacity-40 grayscale")}
        />
        {!isIncluded && (
          <X
            className="absolute inset-0 m-auto size-10 text-fg-muted"
            aria-hidden
          />
        )}
      </button>
      <CheckboxField
        label="Include the screenshot"
        checked={isIncluded}
        onChange={toggle}
      />
    </div>
  );
}
