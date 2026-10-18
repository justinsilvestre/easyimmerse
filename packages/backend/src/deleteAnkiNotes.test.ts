import type { AnkiConnection } from "@easyimmerse/state";
import type { AnkiPendingDeletions } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import { AnkiConnectError } from "./ankiConnectError.ts";
import type { BackendRequest, BackendResult } from "./backendClient.ts";
import { deleteAnkiNotes } from "./deleteAnkiNotes.ts";
import { type AnkiAnswers, createFakeAnkiConnect } from "./fakeAnkiConnect.ts";

/** Anki holding the given notes for every flashcard it is asked about. */
const holding = (noteIds: number[]): AnkiAnswers => ({
  version: () => 6,
  findNotes: () => noteIds,
  deleteNotes: () => null,
});

const pending: AnkiPendingDeletions = {
  deletions: [
    {
      flashcard_id: "f1",
      word: "고양이",
      requested_at_ms: 1,
    },
    {
      flashcard_id: "f2",
      word: "개",
      requested_at_ms: 2,
    },
  ],
};

/** A server that lists `listed` as the pending deletions, answers each clear with `cleared`, and records every request. */
function createFakeServer(
  listed: BackendResult<unknown> = { data: pending },
  cleared: (path: string) => BackendResult<unknown> = () => ({
    data: undefined,
  }),
) {
  const requests: BackendRequest[] = [];
  const server = async (request: BackendRequest) => {
    requests.push(request);
    return request.method === "GET" ? listed : cleared(request.path);
  };
  return { requests, server };
}

/** A server that fails to clear the deletion of f1. */
const failingToClearF1 = (path: string): BackendResult<unknown> =>
  path.endsWith("/f1")
    ? { error: { status: 500, message: "down" } }
    : { data: undefined };

/** Anki that answers its version, then the first `count` other actions as `answers` says, and then stops answering. */
function stoppingAfter(count: number, answers: AnkiAnswers): AnkiAnswers {
  let answered = 0;
  const once =
    (handler: ((params: Record<string, unknown>) => unknown) | undefined) =>
    (params: Record<string, unknown>) => {
      answered += 1;
      if (answered > count || handler === undefined)
        throw new AnkiConnectError({ kind: "unreachable" });
      return handler(params);
    };
  return {
    version: answers.version,
    findNotes: once(answers.findNotes),
    deleteNotes: once(answers.deleteNotes),
  };
}

/**
 * Deletes p1's pending notes from the fake Anki and server.
 * `isAnkiNew` is what reporting that Anki answered tells: whether the app had not known Anki to be running.
 */
function run(
  answers: AnkiAnswers = holding([100]),
  listed?: BackendResult<unknown>,
  cleared?: (path: string) => BackendResult<unknown>,
  isAnkiNew = false,
) {
  const anki = createFakeAnkiConnect(answers);
  const { requests, server } = createFakeServer(listed, cleared);
  const connections: AnkiConnection[] = [];
  const result = deleteAnkiNotes("p1", {
    anki,
    server,
    reportConnection: (connection) => {
      connections.push(connection);
      return isAnkiNew && connection.connected;
    },
  });
  return { anki, requests, connections, result };
}

const clearedPaths = (requests: BackendRequest[]) =>
  requests.filter(({ method }) => method === "DELETE").map(({ path }) => path);

describe("deleteAnkiNotes", () => {
  it("lists the project's pending deletions on the server", async () => {
    const { requests, result } = run();
    await result;
    expect(requests[0]).toEqual({
      method: "GET",
      path: "/projects/p1/anki/pending-deletions",
    });
  });

  it("looks for each note by the deleted flashcard's id", async () => {
    const { anki, result } = run();
    await result;
    expect(anki.requests[1]).toEqual({
      action: "findNotes",
      version: 6,
      params: { query: '"easyImmerse id:f1"' },
    });
  });

  it("deletes the notes Anki holds for a deleted flashcard", async () => {
    const { anki, result } = run();
    await result;
    expect(anki.requests[2]).toEqual({
      action: "deleteNotes",
      version: 6,
      params: { notes: [100] },
    });
  });

  it("deletes nothing when Anki holds no note for a deleted flashcard", async () => {
    const { anki, result } = run(holding([]));
    await result;
    expect(anki.requests.map(({ action }) => action)).toEqual([
      "version",
      "findNotes",
      "findNotes",
    ]);
  });

  it("clears every deletion it carried out on the server", async () => {
    const { requests, result } = run();
    await result;
    expect(clearedPaths(requests)).toEqual([
      "/projects/p1/anki/pending-deletions/f1",
      "/projects/p1/anki/pending-deletions/f2",
    ]);
  });

  it("clears a deletion whose flashcard Anki holds no note for", async () => {
    const { requests, result } = run(holding([]));
    await result;
    expect(clearedPaths(requests)).toHaveLength(2);
  });

  it("counts the notes Anki deleted", async () => {
    expect(await run(holding([100, 101])).result).toMatchObject({
      data: { deletedCount: 4 },
    });
  });

  it("names the flashcards whose notes Anki deleted", async () => {
    const answers = {
      ...holding([]),
      findNotes: ({ query }: Record<string, unknown>) =>
        query === '"easyImmerse id:f2"' ? [100] : [],
    };
    expect(await run(answers).result).toMatchObject({
      data: { deletedFlashcardIds: ["f2"] },
    });
  });

  it("reports that Anki is connected once it answers", async () => {
    const { connections, result } = run();
    await result;
    expect(connections).toEqual([{ connected: true, version: 6 }]);
  });

  it("tells that it found Anki when the app had not known Anki to be running", async () => {
    expect(
      await run(holding([100]), undefined, undefined, true).result,
    ).toMatchObject({ data: { foundAnki: true } });
  });

  it("asks Anki nothing when no deletion is pending", async () => {
    const { anki, result } = run(holding([100]), { data: { deletions: [] } });
    await result;
    expect(anki.requests).toEqual([]);
  });

  describe("when the server cannot record a deletion Anki carried out", () => {
    it("goes on with the next deletion", async () => {
      const { anki, result } = run(holding([100]), undefined, failingToClearF1);
      await result;
      expect(anki.requests[3]).toEqual({
        action: "findNotes",
        version: 6,
        params: { query: '"easyImmerse id:f2"' },
      });
    });

    it("counts the deletion as not recorded", async () => {
      expect(
        await run(holding([100]), undefined, failingToClearF1).result,
      ).toEqual({
        data: {
          deletedCount: 2,
          deletedFlashcardIds: ["f1", "f2"],
          remainingFlashcardIds: [],
          unrecordedCount: 1,
          foundAnki: false,
        },
      });
    });
  });

  describe("when Anki stops answering", () => {
    const halfway = () => stoppingAfter(2, holding([100]));

    it("names the deleted flashcards whose notes are left pending", async () => {
      expect(await run(halfway()).result).toEqual({
        data: {
          deletedCount: 1,
          deletedFlashcardIds: ["f1"],
          remainingFlashcardIds: ["f2"],
          unrecordedCount: 0,
          foundAnki: false,
        },
      });
    });

    it("leaves the rest pending on the server", async () => {
      const { requests, result } = run(halfway());
      await result;
      expect(clearedPaths(requests)).toEqual([
        "/projects/p1/anki/pending-deletions/f1",
      ]);
    });

    it("leaves every deletion pending when Anki does not answer at all", async () => {
      expect(await run({}).result).toMatchObject({
        data: { deletedCount: 0, remainingFlashcardIds: ["f1", "f2"] },
      });
    });

    it("reports that Anki is not connected", async () => {
      const { connections, result } = run({});
      await result;
      expect(connections).toEqual([{ connected: false, isDenied: false }]);
    });
  });

  describe("when Anki refuses easyImmerse", () => {
    const denying: AnkiAnswers = {
      version: () => {
        throw new AnkiConnectError({
          kind: "denied",
          origin: "http://localhost:5173",
        });
      },
    };

    it("fails as Anki refusing this page", async () => {
      expect(await run(denying).result).toMatchObject({
        error: { code: "anki_denied" },
      });
    });

    it("reports that Anki refused easyImmerse", async () => {
      const { connections, result } = run(denying);
      await result;
      expect(connections).toEqual([
        { connected: false, isDenied: true, origin: "http://localhost:5173" },
      ]);
    });
  });

  it("fails with Anki's answer when Anki refuses", async () => {
    const answers = {
      ...holding([100]),
      deleteNotes: () => {
        throw new AnkiConnectError({
          kind: "failed",
          message: "collection is not available",
        });
      },
    };
    expect(await run(answers).result).toMatchObject({
      error: { status: 502, message: "collection is not available" },
    });
  });

  it("leaves a deletion Anki refused pending", async () => {
    const answers = {
      ...holding([100]),
      deleteNotes: () => {
        throw new AnkiConnectError({ kind: "failed", message: "x" });
      },
    };
    const { requests, result } = run(answers);
    await result;
    expect(clearedPaths(requests)).toEqual([]);
  });

  it("fails as the server does when it cannot list the deletions", async () => {
    const failure = { status: 500, message: "down" };
    expect(await run(holding([100]), { error: failure }).result).toEqual({
      error: failure,
    });
  });
});
