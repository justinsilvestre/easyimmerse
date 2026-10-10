import { selectFlashcardForm, selectMediaDurationMs } from "@easyimmerse/state";
import type { MediaFile } from "@easyimmerse/types";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { ConnectedFlashcardEditor } from "./ConnectedFlashcardEditor.tsx";
import type { FlashcardLanguages } from "./flashcardFields.ts";
import { useClipWaveform } from "./useClipWaveform.ts";
import type { ScreenshotSource } from "./useScreenshotSource.ts";
import { useScreenshotUrl } from "./useScreenshotUrl.ts";

/**
 * The flashcard editor of the media screen, for the card open in the form, with the audio around its clip and its screenshot.
 * It reads the form itself, so that editing the card renders only the editor. Nothing shows while no card is open.
 */
export function MediaFlashcardEditor({
  mediaFile,
  screenshotSource,
  languages,
}: {
  mediaFile: MediaFile | null;
  screenshotSource: ScreenshotSource | null;
  languages: FlashcardLanguages;
}) {
  const form = useAppSelector((state) => selectFlashcardForm(state.app));
  const durationMs = useAppSelector(selectMediaDurationMs);
  const content = form?.card.editor.content;
  const waveform = useClipWaveform(
    mediaFile,
    durationMs,
    content?.audio_context ?? null,
  );
  const screenshotUrl = useScreenshotUrl(
    screenshotSource,
    content?.screenshot?.at_ms ?? null,
  );
  return (
    form && (
      <ConnectedFlashcardEditor
        form={form}
        languages={languages}
        waveform={waveform}
        screenshotUrl={screenshotUrl}
      />
    )
  );
}
