import {
  connectionNotKeptCode,
  serverConfigStorageKey,
} from "@easyimmerse/state";
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

/** A storage that holds nothing and refuses every value, as a full one does. */
class FullStorage implements Storage {
  readonly length = 0;
  clear() {}
  getItem() {
    return null;
  }
  key() {
    return null;
  }
  removeItem() {}
  setItem(): never {
    throw new Error("The quota has been exceeded.");
  }
}

/** Account effects over the fetch and storage, with reloads recorded. */
function effectsOver(fetchFn: typeof fetch, storage: Storage = new Storage()) {
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

  describe("when the server refuses too many attempts", () => {
    const refusing = (headers: Record<string, string>) =>
      answering(
        () =>
          new Response(
            JSON.stringify({
              code: "too_many_attempts",
              message: "Slow down.",
            }),
            { status: 429, headers },
          ),
      ).fetchFn;

    it("keeps the seconds the server asks to wait", async () => {
      const outcome = await effectsOver(
        refusing({ "retry-after": "120" }),
      ).effects.createSession(attempt);
      expect(outcome).toMatchObject({ error: { retryAfterSeconds: 120 } });
    });

    it("keeps no wait when the server names a date", async () => {
      const outcome = await effectsOver(
        refusing({ "retry-after": "Wed, 21 Oct 2026 07:28:00 GMT" }),
      ).effects.createSession(attempt);
      expect(outcome).toEqual({
        ok: false,
        error: {
          status: 429,
          code: "too_many_attempts",
          message: "Slow down.",
        },
      });
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

    it("resolves as a failure the storage refuses", async () => {
      const { effects } = effectsOver(unreachable, new FullStorage());
      expect(
        await effects.connectToServer({ serverUrl, token: "session-token" }),
      ).toEqual({
        ok: false,
        error: {
          status: "NO_DATA",
          code: connectionNotKeptCode,
          message: "The quota has been exceeded.",
        },
      });
    });

    it("does not reload when the storage refuses", async () => {
      const { effects, reloads } = effectsOver(unreachable, new FullStorage());
      await effects.connectToServer({ serverUrl, token: "session-token" });
      expect(reloads).toEqual([]);
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
