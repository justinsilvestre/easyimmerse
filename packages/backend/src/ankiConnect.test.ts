import { describe, expect, it } from "vitest";
import { ankiResultOf, createAnkiConnect } from "./ankiConnect.ts";
import { ankiConnectActions } from "./ankiConnectActions.ts";
import { AnkiConnectError } from "./ankiConnectError.ts";

type Posted = { url: string; body: unknown };

/** A fetch that records each post and answers it as Anki would: permission granted, then the given answer. */
function createFakeAnkiFetch(
  answer: (action: string) => Response | Promise<Response>,
) {
  const posted: Posted[] = [];
  const fetchFn = (async (url: string | URL, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body)) as { action: string };
    posted.push({ url: String(url), body });
    return answer(body.action);
  }) as typeof fetch;
  return { posted, fetchFn };
}

const answering = (result: unknown, error: string | null = null) =>
  Response.json({ result, error });

/** Grants permission, and answers every other action with `result`. */
const granting = (result: unknown) => (action: string) =>
  action === "requestPermission"
    ? answering({ permission: "granted", version: 6 })
    : answering(result);

const failureOf = async (invoked: Promise<unknown>) =>
  invoked.then(
    () => null,
    (error: unknown) => (error as AnkiConnectError).failure,
  );

describe("createAnkiConnect", () => {
  it("posts each action to AnkiConnect, after asking for permission", async () => {
    const { posted, fetchFn } = createFakeAnkiFetch(granting(6));
    await createAnkiConnect(fetchFn).invoke(ankiConnectActions.version());
    expect(posted).toEqual([
      {
        url: "http://127.0.0.1:8765",
        body: { action: "requestPermission", version: 6, params: {} },
      },
      {
        url: "http://127.0.0.1:8765",
        body: { action: "version", version: 6, params: {} },
      },
    ]);
  });

  it("asks for permission only once", async () => {
    const { posted, fetchFn } = createFakeAnkiFetch(granting(6));
    const anki = createAnkiConnect(fetchFn);
    await anki.invoke(ankiConnectActions.version());
    await anki.invoke(ankiConnectActions.version());
    expect(posted).toHaveLength(3);
  });

  it("resolves the action's result", async () => {
    const { fetchFn } = createFakeAnkiFetch(granting(["Default"]));
    expect(
      await createAnkiConnect(fetchFn).invoke(ankiConnectActions.deckNames()),
    ).toEqual(["Default"]);
  });

  it("fails as unreachable when Anki does not answer", async () => {
    const { fetchFn } = createFakeAnkiFetch(() =>
      Promise.reject(new TypeError("Failed to fetch")),
    );
    expect(
      await failureOf(
        createAnkiConnect(fetchFn).invoke(ankiConnectActions.version()),
      ),
    ).toEqual({ kind: "unreachable" });
  });

  it("fails as denied when Anki refuses this page", async () => {
    const { fetchFn } = createFakeAnkiFetch(() =>
      answering({ permission: "denied" }),
    );
    expect(
      await failureOf(
        createAnkiConnect(fetchFn).invoke(ankiConnectActions.version()),
      ),
    ).toEqual({ kind: "denied" });
  });

  it("asks for permission again once it was refused", async () => {
    const { posted, fetchFn } = createFakeAnkiFetch(() =>
      answering({ permission: "denied" }),
    );
    const anki = createAnkiConnect(fetchFn);
    await failureOf(anki.invoke(ankiConnectActions.version()));
    await failureOf(anki.invoke(ankiConnectActions.version()));
    expect(posted).toHaveLength(2);
  });

  it("fails with the error Anki answers", async () => {
    const { fetchFn } = createFakeAnkiFetch((action) =>
      action === "requestPermission"
        ? answering({ permission: "granted" })
        : answering(null, "model was not found: Basic"),
    );
    expect(
      await failureOf(
        createAnkiConnect(fetchFn).invoke(ankiConnectActions.modelNames()),
      ),
    ).toEqual({ kind: "failed", message: "model was not found: Basic" });
  });
});

describe("ankiResultOf", () => {
  it("fails for an answer without a result", () => {
    expect(() => ankiResultOf("Anki-Connect")).toThrow(AnkiConnectError);
  });
});
