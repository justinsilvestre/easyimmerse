import type { AnkiNote, AnkiNotes } from "@easyimmerse/types";
import type { AnkiConnect } from "./ankiConnect.ts";
import { ankiResultOf } from "./ankiConnect.ts";
import {
  ankiConnectActions,
  connectNoteOf,
  fieldsOf,
  flashcardNoteQuery,
} from "./ankiConnectActions.ts";
import { hasSucceeded, recoverActionFailure } from "./ankiConnectError.ts";

/** The flashcards whose notes Anki added or updated, and how many notes it refused. */
export type SyncedNotes = { sentFlashcardIds: string[]; failedCount: number };

/**
 * Puts the notes into Anki: a note Anki already holds for the same flashcard, found by its id field, is updated,
 * and the others are added. A note Anki refuses, such as one whose first field is empty, counts as failed.
 */
export async function syncNotes(
  anki: AnkiConnect,
  notes: AnkiNotes,
): Promise<SyncedNotes> {
  const existing = await findExistingNotes(anki, notes.notes);
  const toUpdate = notes.notes.flatMap((note, index) => {
    const id = existing[index];
    return id === undefined || id === null ? [] : [{ note, id }];
  });
  const toAdd = notes.notes.filter((_, index) => existing[index] == null);
  const sentFlashcardIds = [
    ...(await updateNotes(anki, notes, toUpdate)),
    ...(await addNotes(anki, notes, toAdd)),
  ];
  return {
    sentFlashcardIds,
    failedCount: notes.notes.length - sentFlashcardIds.length,
  };
}

/** Finds the note Anki holds for each note's flashcard, in one request, or null for each it has none for. */
async function findExistingNotes(
  anki: AnkiConnect,
  notes: readonly AnkiNote[],
): Promise<(number | null)[]> {
  if (notes.length === 0) return [];
  const searches = notes.map(({ flashcard_id }) =>
    ankiConnectActions.findNotes(flashcardNoteQuery(flashcard_id)),
  );
  const answers = await anki.invoke<unknown[]>(
    ankiConnectActions.multi(searches),
  );
  return answers.map((answer) => ankiResultOf<number[]>(answer)[0] ?? null);
}

async function updateNotes(
  anki: AnkiConnect,
  { note_type }: AnkiNotes,
  updates: readonly { note: AnkiNote; id: number }[],
): Promise<string[]> {
  const sent: string[] = [];
  for (const { note, id } of updates) {
    const request = ankiConnectActions.updateNoteFields(
      id,
      fieldsOf(note_type, note),
    );
    if (await hasSucceeded(anki.invoke(request))) sent.push(note.flashcard_id);
  }
  return sent;
}

/** Adds the notes Anki can add; asking first keeps one refused note from failing the others. */
async function addNotes(
  anki: AnkiConnect,
  { deck_name, note_type }: AnkiNotes,
  notes: readonly AnkiNote[],
): Promise<string[]> {
  if (notes.length === 0) return [];
  const connectNotes = notes.map((note) =>
    connectNoteOf(deck_name, note_type, note),
  );
  const checks = await anki.invoke<{ canAdd: boolean }[]>(
    ankiConnectActions.canAddNotesWithErrorDetail(connectNotes),
  );
  const addable = notes.filter((_, index) => checks[index]?.canAdd === true);
  if (addable.length === 0) return [];
  const ids = await anki
    .invoke<(number | null)[]>(
      ankiConnectActions.addNotes(
        connectNotes.filter((_, index) => checks[index]?.canAdd === true),
      ),
    )
    .catch(recoverActionFailure<(number | null)[]>([]));
  return addable.flatMap((note, index) => {
    const id = ids[index];
    return typeof id === "number" ? [note.flashcard_id] : [];
  });
}
