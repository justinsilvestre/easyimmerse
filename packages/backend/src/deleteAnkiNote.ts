import type { AnkiConnect } from "./ankiConnect.ts";
import {
  ankiConnectActions,
  flashcardNoteQuery,
} from "./ankiConnectActions.ts";
import { ankiBackendError } from "./ankiConnectError.ts";
import type { BackendResult } from "./backendClient.ts";

/**
 * Deletes from Anki, with its cards, the note that holds a flashcard's id, found as a send finds it.
 * Finding no such note counts as done.
 */
export async function deleteAnkiNote(
  flashcardId: string,
  anki: AnkiConnect,
): Promise<BackendResult<void>> {
  try {
    const noteIds = await anki.invoke<number[]>(
      ankiConnectActions.findNotes(flashcardNoteQuery(flashcardId)),
    );
    if (noteIds.length > 0)
      await anki.invoke(ankiConnectActions.deleteNotes(noteIds));
    return { data: undefined };
  } catch (error) {
    return { error: ankiBackendError(error) };
  }
}
