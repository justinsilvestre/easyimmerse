import type { AnkiConnection } from "@easyimmerse/state";
import type { AnkiNote, AnkiNotes } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import { AnkiConnectError } from "./ankiConnectError.ts";
import type { MediaFetch } from "./ankiMedia.ts";
import type { BackendRequest, BackendResult } from "./backendClient.ts";
import { type AnkiAnswers, createFakeAnkiConnect } from "./fakeAnkiConnect.ts";
import { sendFlashcardsToAnki } from "./sendToAnki.ts";

const note = (flashcardId: string, word: string): AnkiNote => ({
  flashcard_id: flashcardId,
  guid: `guid-${flashcardId}`,
  note_id: 1,
  fields: [word, "", flashcardId],
  tags: [],
  media: [],
});

const withMedia: AnkiNote = {
  ...note("f1", "고양이"),
  fields: ["고양이", '<img src="f1.jpg">', "f1"],
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
    fields: ["Word", "Screenshot", "easyImmerse id"],
    templates: [{ name: "Card", front: "{{Word}}", back: "{{Word}}" }],
    css: "",
  },
  notes: [withMedia, { ...note("f2", "개"), tags: ["verbs", "movie"] }],
  rendered_at_ms: 1_700,
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
  updateNote: () => null,
};

/** A server that renders `rendered`, answers the record of a send with `recorded`, and records every request. */
function createFakeServer(
  notes: BackendResult<unknown> = { data: rendered },
  recorded: BackendResult<unknown> = { data: undefined },
) {
  const requests: BackendRequest[] = [];
  const server = async (request: BackendRequest) => {
    requests.push(request);
    return request.path.endsWith("/notes") ? notes : recorded;
  };
  return { requests, server };
}

const clipBytes: MediaFetch = async (_projectId, media) =>
  media.kind === "audio" ? new TextEncoder().encode("clip") : null;

/**
 * Sends f1 and f2 to the fake Anki and server.
 * `isAnkiNew` is what reporting that Anki answered tells: whether the app had not known Anki to be running.
 */
function send(
  answers: AnkiAnswers = ankiAnswers,
  notes?: BackendResult<unknown>,
  isAnkiNew = false,
  recorded?: BackendResult<unknown>,
) {
  const anki = createFakeAnkiConnect(answers);
  const { requests, server } = createFakeServer(notes, recorded);
  const connections: AnkiConnection[] = [];
  const sent = sendFlashcardsToAnki(
    { projectId: "p1", flashcardIds: ["f1", "f2"] },
    {
      anki,
      server,
      fetchMedia: clipBytes,
      reportConnection: (connection) => {
        connections.push(connection);
        return isAnkiNew && connection.connected;
      },
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
    expect(sending.connections).toEqual([
      { connected: false, isDenied: false },
    ]);
  });

  it("reports that Anki refused easyImmerse when it denies this page", async () => {
    const sending = send({
      version: () => {
        throw new AnkiConnectError({
          kind: "denied",
          origin: "http://localhost:5173",
        });
      },
    });
    await sending.sent;
    expect(sending.connections).toEqual([
      { connected: false, isDenied: true, origin: "http://localhost:5173" },
    ]);
  });

  it("reports that Anki is connected once it answers", async () => {
    const sending = send();
    await sending.sent;
    expect(sending.connections).toEqual([{ connected: true, version: 6 }]);
  });

  it("tells that it found Anki when the app had not known Anki to be running", async () => {
    expect(await send(ankiAnswers, undefined, true).sent).toMatchObject({
      data: { foundAnki: true },
    });
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

  describe("when the server renders no note, as for flashcards deleted since", () => {
    const noNotes = { data: { ...rendered, notes: [] } };

    it("asks Anki for nothing but its version", async () => {
      const requests = await actionsOf(send(ankiAnswers, noNotes));
      expect(requests.map(({ action }) => action)).toEqual(["version"]);
    });

    it("records no send with the server", async () => {
      const sending = send(ankiAnswers, noNotes);
      await sending.sent;
      expect(sending.serverRequests).toHaveLength(1);
    });

    it("counts nothing sent", async () => {
      expect(await send(ankiAnswers, noNotes).sent).toEqual({
        data: {
          sentCount: 0,
          failedCount: 0,
          skippedMediaCount: 0,
          isRecorded: true,
          foundAnki: false,
        },
      });
    });
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

  it("drops a note's reference to a media file the server cannot render", async () => {
    const requests = await actionsOf(send());
    const added = requests.find(({ action }) => action === "addNotes");
    expect(added?.params.notes).toMatchObject([
      { fields: { Word: "고양이", Screenshot: "", "easyImmerse id": "f1" } },
      {},
    ]);
  });

  it("updates the fields and tags of the note Anki holds for a flashcard", async () => {
    const requests = await actionsOf(
      send({
        ...ankiAnswers,
        findNotes: ({ query }) => (query === '"easyImmerse id:f2"' ? [42] : []),
      }),
    );
    expect(requests).toContainEqual({
      action: "updateNote",
      version: 6,
      params: {
        note: {
          id: 42,
          fields: { Word: "개", Screenshot: "", "easyImmerse id": "f2" },
          tags: ["verbs", "movie"],
        },
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
      data: {
        sentCount: 1,
        failedCount: 1,
        skippedMediaCount: 1,
        isRecorded: true,
        foundAnki: false,
      },
    });
  });

  it("tells that the server could not record the send once Anki holds the notes", async () => {
    const failure = { error: { status: 500, message: "down" } };
    expect(
      await send(ankiAnswers, undefined, false, failure).sent,
    ).toMatchObject({ data: { sentCount: 2, isRecorded: false } });
  });

  it("records with the server which flashcards Anki holds, as of the time their notes were rendered", async () => {
    const sending = send();
    await sending.sent;
    expect(sending.serverRequests[1]).toEqual({
      method: "POST",
      path: "/projects/p1/anki/sent",
      body: {
        kind: "json",
        value: { flashcard_ids: ["f1", "f2"], rendered_at_ms: 1_700 },
      },
    });
  });
});
