import { serverConfigStorageKey } from "@easyimmerse/state";
import { describe, expect, it } from "vitest";
import { createAccountEffects } from "./accountEffects.ts";

const serverUrl = "https://books.example.org";

type SentRequest = { url: string; init: RequestInit | undefined };

/** A fetch that records each request and answers with a fresh copy of the given response. */
function answering(makeResponse: () => Response) {
  const sent: SentRequest[] = [];
  const fetchFn: typeof fetch = async (input, init) => {
    sent.push({ url: String(input), init });
    return makeResponse();
  };
  return { sent, fetchFn };
}

const json =
  (body: unknown, status = 200) =>
  () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    });

const unreachable: typeof fetch = async () => {
  throw new TypeError("Failed to fetch");
};

/** Account effects over the fetch, with storage and reloads recorded. */
function effectsOver(fetchFn: typeof fetch) {
  const storage = new Storage();
  const reloads: number[] = [];
  const effects = createAccountEffects(fetchFn, storage, () =>
    reloads.push(reloads.length),
  );
  return { effects, storage, reloads };
}

const attempt = {
  serverUrl,
  mode: "signup",
  email: "someone@example.com",
  password: "correct horse",
} as const;

const session = {
  token: "session-token",
  user: {
    id: "u1",
    email: "someone@example.com",
    role: "library_user",
    created_at_ms: 0,
  },
};

describe("createAccountEffects", () => {
  describe("fetchServerAuthInfo", () => {
    it("asks the server's /auth/server", async () => {
      const { sent, fetchFn } = answering(
        json({ accounts: true, open_signup: false }),
      );
      await effectsOver(fetchFn).effects.fetchServerAuthInfo(serverUrl);
      expect(sent.map(({ url }) => url)).toEqual([
        "https://books.example.org/auth/server",
      ]);
    });

    it("resolves with what the server offers", async () => {
      const { fetchFn } = answering(
        json({ accounts: true, open_signup: false }),
      );
      expect(
        await effectsOver(fetchFn).effects.fetchServerAuthInfo(serverUrl),
      ).toEqual({ ok: true, data: { accounts: true, open_signup: false } });
    });

    it("resolves as a network failure when the server cannot be reached", async () => {
      expect(
        await effectsOver(unreachable).effects.fetchServerAuthInfo(serverUrl),
      ).toEqual({
        ok: false,
        error: { status: "NETWORK", message: "Failed to fetch" },
      });
    });

    it("resolves as unreadable when the answer is not JSON", async () => {
      const { fetchFn } = answering(() => new Response("<html></html>"));
      expect(
        await effectsOver(fetchFn).effects.fetchServerAuthInfo(serverUrl),
      ).toMatchObject({ ok: false, error: { status: "NO_DATA" } });
    });
  });

  describe("createSession", () => {
    it("posts the email and password to the mode's route", async () => {
      const { sent, fetchFn } = answering(json(session, 201));
      await effectsOver(fetchFn).effects.createSession(attempt);
      expect(sent).toEqual([
        {
          url: "https://books.example.org/auth/signup",
          init: {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              email: "someone@example.com",
              password: "correct horse",
            }),
          },
        },
      ]);
    });

    it("resolves with the session the server opened", async () => {
      const { fetchFn } = answering(json(session, 201));
      expect(await effectsOver(fetchFn).effects.createSession(attempt)).toEqual(
        { ok: true, data: session },
      );
    });

    it("resolves with the API error the server answers", async () => {
      const { fetchFn } = answering(
        json({ code: "email_taken", message: "The email is taken." }, 409),
      );
      expect(await effectsOver(fetchFn).effects.createSession(attempt)).toEqual(
        {
          ok: false,
          error: {
            status: 409,
            code: "email_taken",
            message: "The email is taken.",
          },
        },
      );
    });
  });

  describe("connectToServer", () => {
    it("keeps the server and token where the app looks when it starts", () => {
      const { effects, storage } = effectsOver(unreachable);
      effects.connectToServer({ serverUrl, token: "session-token" });
      expect(storage.getItem(serverConfigStorageKey)).toBe(
        JSON.stringify({ serverUrl, token: "session-token" }),
      );
    });

    it("reloads the page", () => {
      const { effects, reloads } = effectsOver(unreachable);
      effects.connectToServer({ serverUrl, token: "session-token" });
      expect(reloads).toHaveLength(1);
    });
  });

  describe("disconnectFromServer", () => {
    it("forgets the server", () => {
      const { effects, storage } = effectsOver(unreachable);
      storage.setItem(serverConfigStorageKey, "{}");
      effects.disconnectFromServer();
      expect(storage.getItem(serverConfigStorageKey)).toBeNull();
    });

    it("reloads the page", () => {
      const { effects, reloads } = effectsOver(unreachable);
      effects.disconnectFromServer();
      expect(reloads).toHaveLength(1);
    });
  });
});
