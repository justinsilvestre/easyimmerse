import type { AnkiConnection } from "@easyimmerse/state";
import type { AnkiNote, AnkiNotes } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import type { MediaFetch } from "./ankiMedia.ts";
import type { BackendRequest, BackendResult } from "./backendClient.ts";
import { type AnkiAnswers, createFakeAnkiConnect } from "./fakeAnkiConnect.ts";
import { sendFlashcardsToAnki } from "./sendToAnki.ts";

const note = (flashcardId: string, word: string): AnkiNote => ({
  flashcard_id: flashcardId,
  guid: `guid-${flashcardId}`,
  note_id: 1,
  updated_at_ms: 1,
  fields: [word, flashcardId],
  tags: [],
  media: [],
});

const withMedia: AnkiNote = {
  ...note("f1", "고양이"),
  media: [
    {
      kind: "audio",
      file_name: "f1.m4a",
      media_file_id: "m1",
      start_ms: 0,
      end_ms: 1000,
    },
    {
      kind: "screenshot",
      file_name: "f1.jpg",
      media_file_id: "m1",
      at_ms: 500,
    },
  ],
};

const rendered: AnkiNotes = {
  deck_name: "Korean",
  note_type: {
    id: 1 << 30,
    name: "easyImmerse: Korean",
    fields: ["Word", "easyImmerse id"],
    templates: [{ name: "Card", front: "{{Word}}", back: "{{Word}}" }],
    css: "",
  },
  notes: [withMedia, note("f2", "개")],
};

/** Anki with the deck and the note type, no note of either flashcard, and every note addable as note id 100 and on. */
const ankiAnswers: AnkiAnswers = {
  version: () => 6,
  deckNames: () => ["Default", "Korean"],
  modelNames: () => ["Basic", "easyImmerse: Korean"],
  storeMediaFile: ({ filename }) => filename,
  findNotes: () => [],
  canAddNotesWithErrorDetail: ({ notes }) =>
    (notes as unknown[]).map(() => ({ canAdd: true, error: null })),
  addNotes: ({ notes }) => (notes as unknown[]).map((_, index) => 100 + index),
  updateNoteFields: () => null,
};

/** A server that renders `rendered` and records every request. */
function createFakeServer(notes: BackendResult<unknown> = { data: rendered }) {
  const requests: BackendRequest[] = [];
  const server = async (request: BackendRequest) => {
    requests.push(request);
    return request.path.endsWith("/notes") ? notes : { data: undefined };
  };
  return { requests, server };
}

const clipBytes: MediaFetch = async (_projectId, media) =>
  media.kind === "audio" ? new TextEncoder().encode("clip") : null;

function send(
  answers: AnkiAnswers = ankiAnswers,
  notes?: BackendResult<unknown>,
) {
  const anki = createFakeAnkiConnect(answers);
  const { requests, server } = createFakeServer(notes);
  const connections: AnkiConnection[] = [];
  const sent = sendFlashcardsToAnki(
    { projectId: "p1", flashcardIds: ["f1", "f2"] },
    {
      anki,
      server,
      fetchMedia: clipBytes,
      reportConnection: (connection) => connections.push(connection),
    },
  );
  return { sent, anki, serverRequests: requests, connections };
}

const actionsOf = async ({ sent, anki }: ReturnType<typeof send>) => {
  await sent;
  return anki.requests;
};

describe("sendFlashcardsToAnki", () => {
  it("fails as Anki not running when it does not answer", async () => {
    const { sent } = send({});
    expect(await sent).toMatchObject({
      error: { code: "anki_unreachable" },
    });
  });

  it("reports that Anki is not connected when it does not answer", async () => {
    const sending = send({});
    await sending.sent;
    expect(sending.connections).toEqual([{ connected: false }]);
  });

  it("reports that Anki is connected once it answers", async () => {
    const sending = send();
    await sending.sent;
    expect(sending.connections).toEqual([{ connected: true, version: 6 }]);
  });

  it("asks the server to render the flashcards as notes", async () => {
    const sending = send();
    await sending.sent;
    expect(sending.serverRequests[0]).toEqual({
      method: "POST",
      path: "/projects/p1/anki/notes",
      body: { kind: "json", value: { flashcard_ids: ["f1", "f2"] } },
    });
  });

  it("fails as the server does when it cannot render the notes", async () => {
    const error = { status: 404, message: "not found" };
    expect(await send(ankiAnswers, { error }).sent).toEqual({ error });
  });

  it("creates the deck Anki lacks", async () => {
    const requests = await actionsOf(
      send({ ...ankiAnswers, deckNames: () => [], createDeck: () => 1 }),
    );
    expect(requests).toContainEqual({
      action: "createDeck",
      version: 6,
      params: { deck: "Korean" },
    });
  });

  it("creates the note type Anki lacks", async () => {
    const requests = await actionsOf(
      send({ ...ankiAnswers, modelNames: () => [], createModel: () => ({}) }),
    );
    expect(requests.map(({ action }) => action)).toContain("createModel");
  });

  it("leaves a note type Anki has as it is", async () => {
    const requests = await actionsOf(send());
    expect(requests.map(({ action }) => action)).not.toContain("createModel");
  });

  it("stores each media file the server renders, in base64", async () => {
    const requests = await actionsOf(send());
    expect(
      requests.filter(({ action }) => action === "storeMediaFile"),
    ).toEqual([
      {
        action: "storeMediaFile",
        version: 6,
        params: { filename: "f1.m4a", data: "Y2xpcA==" },
      },
    ]);
  });

  it("counts the media files the server cannot render", async () => {
    expect(await send().sent).toMatchObject({
      data: { skippedMediaCount: 1 },
    });
  });

  it("updates the note Anki holds for a flashcard", async () => {
    const requests = await actionsOf(
      send({
        ...ankiAnswers,
        findNotes: ({ query }) => (query === '"easyImmerse id:f2"' ? [42] : []),
      }),
    );
    expect(requests).toContainEqual({
      action: "updateNoteFields",
      version: 6,
      params: {
        note: { id: 42, fields: { Word: "개", "easyImmerse id": "f2" } },
      },
    });
  });

  it("adds only the notes Anki holds none for", async () => {
    const requests = await actionsOf(
      send({
        ...ankiAnswers,
        findNotes: ({ query }) => (query === '"easyImmerse id:f2"' ? [42] : []),
      }),
    );
    const added = requests.find(({ action }) => action === "addNotes");
    expect(added?.params.notes).toMatchObject([
      { fields: { "easyImmerse id": "f1" } },
    ]);
  });

  it("counts a note Anki refuses as failed", async () => {
    const sent = await send({
      ...ankiAnswers,
      canAddNotesWithErrorDetail: () => [
        { canAdd: false, error: "cannot create note because it is empty" },
        { canAdd: true, error: null },
      ],
    }).sent;
    expect(sent).toEqual({
      data: { sentCount: 1, failedCount: 1, skippedMediaCount: 1 },
    });
  });

  it("records with the server which notes Anki holds", async () => {
    const sending = send();
    await sending.sent;
    expect(sending.serverRequests[1]).toEqual({
      method: "POST",
      path: "/projects/p1/anki/sent",
      body: {
        kind: "json",
        value: {
          notes: [
            { flashcard_id: "f1", anki_note_id: 100 },
            { flashcard_id: "f2", anki_note_id: 101 },
          ],
        },
      },
    });
  });
});
