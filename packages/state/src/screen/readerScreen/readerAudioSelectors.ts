import type { AppState } from "../../app/appState.ts";
import { selectMediaScreen } from "../mediaScreen/mediaScreenSelectors.ts";

/** Returns the audio file the open book is aligned with and the reader plays, or null while it has found none or no book is open. */
export function selectReaderAudioMediaFileId(
  app: Pick<AppState, "route" | "screen">,
): string | null {
  return selectMediaScreen(app)?.screen.reader.audioMediaFileId ?? null;
}
