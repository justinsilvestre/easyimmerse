import type { SignInOutcome } from "@easyimmerse/state";
import type { PairingGrant, ServerAuthInfo } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import {
  resolveServedServer,
  type ServedLocation,
  type ServedServerEffects,
} from "./resolveServedServer.ts";

const origin = "http://192.168.1.5:8787";

/** A page location at the origin with the given fragment, which records the addresses it is asked to load. */
function locationWith(hash: string) {
  const loaded: string[] = [];
  const location: ServedLocation = {
    origin,
    hash,
    pathname: "/",
    search: "",
    replace: (url) => void loaded.push(String(url)),
  };
  return { location, loaded };
}

function createMemoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
    removeItem: (key) => void map.delete(key),
    clear: () => map.clear(),
    key: (index) => [...map.keys()][index] ?? null,
    get length() {
      return map.size;
    },
  };
}

/** Effects whose server answers a claim and a question about signing in as given. */
function answering(
  claim: SignInOutcome<PairingGrant>,
  authInfo: SignInOutcome<unknown> = claim,
): ServedServerEffects {
  return {
    claimPairingCode: async () => claim,
    fetchServerAuthInfo: async () => authInfo as SignInOutcome<ServerAuthInfo>,
  };
}

const granted = answering({ ok: true, data: { token: "launch-token" } });

const unreachable = answering({
  ok: false,
  error: { status: "NETWORK", message: "Failed to fetch" },
});

function serverAnswering(info: unknown): ServedServerEffects {
  return answering(
    { ok: false, error: { status: 404, message: "" } },
    { ok: true, data: info },
  );
}

describe("resolveServedServer", () => {
  describe("with a pairing code in the fragment", () => {
    it("keeps the server and the token it gives", async () => {
      const storage = createMemoryStorage();
      const { location } = locationWith("#pair=123456");
      await resolveServedServer(location, granted, storage, false);
      expect(JSON.parse(storage.getItem("easyimmerse.server") ?? "")).toEqual({
        serverUrl: origin,
        token: "launch-token",
      });
    });

    it("loads the page again without the fragment", async () => {
      const { location, loaded } = locationWith("#pair=123456");
      await resolveServedServer(
        location,
        granted,
        createMemoryStorage(),
        false,
      );
      expect(loaded).toEqual([`${origin}/`]);
    });

    it("reports a code the server refused", async () => {
      const failure = {
        status: 404,
        code: "pairing_code_invalid",
        message: "wrong",
      } as const;
      const outcome = await resolveServedServer(
        locationWith("#pair=123456").location,
        answering({ ok: false, error: failure }),
        createMemoryStorage(),
        false,
      );
      expect(outcome).toEqual({
        kind: "pairingFailed",
        serverUrl: origin,
        code: "123456",
        failure,
      });
    });

    it("clears the fragment of a code the server refused", async () => {
      const { location } = locationWith("#pair=123456");
      await resolveServedServer(
        location,
        unreachable,
        createMemoryStorage(),
        false,
      );
      expect(location.hash).toBe("");
    });

    it("reports a token it could not keep", async () => {
      const outcome = await resolveServedServer(
        locationWith("#pair=123456").location,
        granted,
        null,
        false,
      );
      expect(outcome.kind).toBe("pairingFailed");
    });
  });

  describe("with a pairing code while the app has a server", () => {
    it("offers the code instead of claiming it", async () => {
      const outcome = await resolveServedServer(
        locationWith("#pair=123456").location,
        granted,
        createMemoryStorage(),
        true,
      );
      expect(outcome).toEqual({
        kind: "pairingOffered",
        serverUrl: origin,
        code: "123456",
      });
    });

    it("keeps the stored server", async () => {
      const storage = createMemoryStorage();
      storage.setItem("easyimmerse.server", "stored");
      await resolveServedServer(
        locationWith("#pair=123456").location,
        granted,
        storage,
        true,
      );
      expect(storage.getItem("easyimmerse.server")).toBe("stored");
    });

    it("clears the fragment so that the page does not offer the code again", async () => {
      const { location } = locationWith("#pair=123456");
      await resolveServedServer(location, granted, createMemoryStorage(), true);
      expect(location.hash).toBe("");
    });
  });

  describe("without a pairing code", () => {
    it("asks the origin what it offers when the app has no server", async () => {
      const info = { accounts: true, open_signup: false };
      const outcome = await resolveServedServer(
        locationWith("").location,
        serverAnswering(info),
        createMemoryStorage(),
        false,
      );
      expect(outcome).toEqual({ kind: "serverFound", serverUrl: origin, info });
    });

    it("finds nothing at an origin that is not an easyImmerse server", async () => {
      const outcome = await resolveServedServer(
        locationWith("").location,
        serverAnswering("<!doctype html>"),
        createMemoryStorage(),
        false,
      );
      expect(outcome).toEqual({ kind: "none" });
    });

    it("finds nothing at an origin it cannot reach", async () => {
      const outcome = await resolveServedServer(
        locationWith("").location,
        unreachable,
        createMemoryStorage(),
        false,
      );
      expect(outcome).toEqual({ kind: "none" });
    });

    it("asks nothing when the app already has a server", async () => {
      const outcome = await resolveServedServer(
        locationWith("").location,
        serverAnswering({ accounts: true, open_signup: true }),
        createMemoryStorage(),
        true,
      );
      expect(outcome).toEqual({ kind: "none" });
    });
  });
});
