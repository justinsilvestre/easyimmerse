import type { AnkiConnection, AnkiSendOutcome } from "@easyimmerse/state";
import type {
  AnkiMediaRef,
  AnkiNote,
  AnkiNotes,
  AnkiNotesRequest,
  AnkiSentNote,
  AnkiSentRequest,
} from "@easyimmerse/types";
import type { AnkiConnect } from "./ankiConnect.ts";
import { ankiConnectActions } from "./ankiConnectActions.ts";
import {
  ankiBackendError,
  hasSucceeded,
  lostConnectionOf,
} from "./ankiConnectError.ts";
import { type MediaFetch, withoutMedia } from "./ankiMedia.ts";
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
  /** Records whether Anki answered, and tells whether it answered although the app had not known it to be running. */
  reportConnection: (connection: AnkiConnection) => boolean;
};

/** How many notes a send put into Anki, before it is known whether the send found Anki anew. */
type SentCounts = Omit<AnkiSendOutcome, "foundAnki">;

const nothingSent: SentCounts = {
  sentCount: 0,
  failedCount: 0,
  skippedMediaCount: 0,
};

/**
 * Sends flashcards to Anki through AnkiConnect: renders them as notes on the server, creates the deck and the note type
 * when Anki lacks them, stores each note's audio clip and screenshot, adds or updates the notes, and records on the server
 * which notes Anki holds for which flashcards. A note type Anki already has is never changed, since the user may have restyled it.
 * Media the server cannot render is left out and counted. When the server renders no note, as for flashcards deleted
 * since the send was asked for, Anki is asked for nothing more and no send is recorded.
 */
export async function sendFlashcardsToAnki(
  args: AnkiSendArgs,
  deps: AnkiSendDeps,
): Promise<BackendResult<AnkiSendOutcome>> {
  try {
    const version = await deps.anki.invoke<number>(
      ankiConnectActions.version(),
    );
    const foundAnki = deps.reportConnection({ connected: true, version });
    const sent = await sendWithAnki(args, deps);
    return "error" in sent ? sent : { data: { ...sent.data, foundAnki } };
  } catch (error) {
    const lost = lostConnectionOf(error);
    if (lost !== null) deps.reportConnection(lost);
    return { error: ankiBackendError(error) };
  }
}

async function sendWithAnki(
  { projectId, flashcardIds }: AnkiSendArgs,
  deps: AnkiSendDeps,
): Promise<BackendResult<SentCounts>> {
  const rendered = await deps.server(notesRequest(projectId, flashcardIds));
  if ("error" in rendered) return rendered;
  const renderedNotes = rendered.data as AnkiNotes;
  if (renderedNotes.notes.length === 0) return { data: nothingSent };
  return putNotes(projectId, renderedNotes, deps);
}

async function putNotes(
  projectId: string,
  renderedNotes: AnkiNotes,
  deps: AnkiSendDeps,
): Promise<BackendResult<SentCounts>> {
  await createDeckAndNoteType(deps.anki, renderedNotes);
  const { notes, skippedMediaCount } = await storeMedia(
    renderedNotes.notes,
    projectId,
    deps,
  );
  const { sent, failedCount } = await syncNotes(deps.anki, {
    ...renderedNotes,
    notes,
  });
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

/**
 * Stores every note's media in Anki. A file that cannot be rendered or stored is counted,
 * and the note no longer refers to it.
 */
async function storeMedia(
  notes: readonly AnkiNote[],
  projectId: string,
  deps: AnkiSendDeps,
): Promise<{ notes: AnkiNote[]; skippedMediaCount: number }> {
  const stored: AnkiNote[] = [];
  let skippedMediaCount = 0;
  for (const note of notes) {
    let kept = note;
    for (const media of note.media) {
      if (await isStored(media, projectId, deps)) continue;
      skippedMediaCount += 1;
      kept = withoutMedia(kept, media);
    }
    stored.push(kept);
  }
  return { notes: stored, skippedMediaCount };
}

/** Renders one media file on the server and stores it in Anki; false when either fails. */
async function isStored(
  media: AnkiMediaRef,
  projectId: string,
  { anki, fetchMedia }: AnkiSendDeps,
): Promise<boolean> {
  const bytes = await fetchMedia(projectId, media);
  if (bytes === null) return false;
  const request = ankiConnectActions.storeMediaFile(
    media.file_name,
    bytesToBase64(bytes),
  );
  return hasSucceeded(anki.invoke(request));
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
