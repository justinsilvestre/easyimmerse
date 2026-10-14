import type { AnkiConnect } from "./ankiConnect.ts";
import { ankiConnectActions } from "./ankiConnectActions.ts";
import { ankiBackendError } from "./ankiConnectError.ts";
import type { BackendResult } from "./backendClient.ts";

/** Deletes notes from Anki through AnkiConnect, with their cards. */
export async function deleteAnkiNotes(
  noteIds: readonly number[],
  anki: AnkiConnect,
): Promise<BackendResult<void>> {
  try {
    await anki.invoke(ankiConnectActions.deleteNotes(noteIds));
    return { data: undefined };
  } catch (error) {
    return { error: ankiBackendError(error) };
  }
}
