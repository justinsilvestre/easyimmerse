import type { AnkiConnection, AnkiSendOutcome } from "@easyimmerse/state";
import type {
  AnkiNote,
  AnkiNotes,
  AnkiNotesRequest,
  AnkiSentNote,
  AnkiSentRequest,
} from "@easyimmerse/types";
import type { AnkiConnect } from "./ankiConnect.ts";
import { ankiConnectActions } from "./ankiConnectActions.ts";
import {
  AnkiConnectError,
  ankiBackendError,
  hasSucceeded,
} from "./ankiConnectError.ts";
import type { MediaFetch } from "./ankiMedia.ts";
import { syncNotes } from "./ankiNoteSync.ts";
import type { BackendRequest, BackendResult } from "./backendClient.ts";
import { bytesToBase64 } from "./base64.ts";

/** The flashcards of a project to send to Anki. */
export type AnkiSendArgs = {
  projectId: string;
  flashcardIds: readonly string[];
};

/** Sends a JSON request to the server, as the store's base query does. */
export type ServerQuery = (
  request: BackendRequest,
) => Promise<BackendResult<unknown>>;

/** What a send to Anki works with: AnkiConnect, the server, the server's media, and where to report whether Anki answered. */
export type AnkiSendDeps = {
  anki: AnkiConnect;
  server: ServerQuery;
  fetchMedia: MediaFetch;
  reportConnection: (connection: AnkiConnection) => void;
};

/**
 * Sends flashcards to Anki through AnkiConnect: renders them as notes on the server, creates the deck and the note type
 * when Anki lacks them, stores each note's audio clip and screenshot, adds or updates the notes, and records on the server
 * which notes Anki holds for which flashcards. A note type Anki already has is never changed, since the user may have restyled it.
 * Media the server cannot render is left out and counted.
 */
export async function sendFlashcardsToAnki(
  args: AnkiSendArgs,
  deps: AnkiSendDeps,
): Promise<BackendResult<AnkiSendOutcome>> {
  try {
    const version = await deps.anki.invoke<number>(
      ankiConnectActions.version(),
    );
    deps.reportConnection({ connected: true, version });
    return await sendWithAnki(args, deps);
  } catch (error) {
    if (isUnreachable(error)) deps.reportConnection({ connected: false });
    return { error: ankiBackendError(error) };
  }
}

async function sendWithAnki(
  { projectId, flashcardIds }: AnkiSendArgs,
  deps: AnkiSendDeps,
): Promise<BackendResult<AnkiSendOutcome>> {
  const rendered = await deps.server(notesRequest(projectId, flashcardIds));
  if ("error" in rendered) return rendered;
  const notes = rendered.data as AnkiNotes;
  await createDeckAndNoteType(deps.anki, notes);
  const skippedMediaCount = await storeMedia(notes.notes, projectId, deps);
  const { sent, failedCount } = await syncNotes(deps.anki, notes);
  const recorded = await deps.server(sentRequest(projectId, sent));
  if ("error" in recorded) return recorded;
  return { data: { sentCount: sent.length, failedCount, skippedMediaCount } };
}

async function createDeckAndNoteType(anki: AnkiConnect, notes: AnkiNotes) {
  const decks = await anki.invoke<string[]>(ankiConnectActions.deckNames());
  if (!decks.includes(notes.deck_name))
    await anki.invoke(ankiConnectActions.createDeck(notes.deck_name));
  const noteTypes = await anki.invoke<string[]>(
    ankiConnectActions.modelNames(),
  );
  if (!noteTypes.includes(notes.note_type.name))
    await anki.invoke(ankiConnectActions.createModel(notes.note_type));
}

/** Stores every note's media in Anki, and returns how many files could not be rendered or stored. */
async function storeMedia(
  notes: readonly AnkiNote[],
  projectId: string,
  { anki, fetchMedia }: AnkiSendDeps,
): Promise<number> {
  let skippedCount = 0;
  for (const media of notes.flatMap((note) => note.media)) {
    const bytes = await fetchMedia(projectId, media);
    const request =
      bytes &&
      ankiConnectActions.storeMediaFile(media.file_name, bytesToBase64(bytes));
    const isStored =
      request !== null && (await hasSucceeded(anki.invoke(request)));
    if (!isStored) skippedCount += 1;
  }
  return skippedCount;
}

function isUnreachable(error: unknown): boolean {
  return (
    error instanceof AnkiConnectError && error.failure.kind === "unreachable"
  );
}

function notesRequest(
  projectId: string,
  flashcardIds: readonly string[],
): BackendRequest {
  return {
    method: "POST",
    path: `/projects/${projectId}/anki/notes`,
    body: {
      kind: "json",
      value: { flashcard_ids: [...flashcardIds] } satisfies AnkiNotesRequest,
    },
  };
}

function sentRequest(projectId: string, notes: AnkiSentNote[]): BackendRequest {
  return {
    method: "POST",
    path: `/projects/${projectId}/anki/sent`,
    body: { kind: "json", value: { notes } satisfies AnkiSentRequest },
  };
}
