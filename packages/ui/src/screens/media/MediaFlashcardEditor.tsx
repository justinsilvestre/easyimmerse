import { selectFlashcardForm, selectMediaDurationMs } from "@easyimmerse/state";
import type { MediaFile } from "@easyimmerse/types";
import { ConnectedFlashcardEditor } from "../../components/flashcardEditor/ConnectedFlashcardEditor.tsx";
import type { FlashcardLanguages } from "../../components/flashcards/flashcardFields.ts";
import type { ScreenshotSource } from "../../components/flashcards/useScreenshotSource.ts";
import { useScreenshotUrl } from "../../components/flashcards/useScreenshotUrl.ts";
import { useAppSelector } from "../../useAppSelector.ts";
import { useClipWaveform } from "./useClipWaveform.ts";

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
