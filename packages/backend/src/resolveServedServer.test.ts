import { actions } from "@easyimmerse/state";
import { describe, expect, it } from "vitest";
import {
  resolveServedServer,
  type ServedLocation,
  servedServerActions,
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

/** A fetch that answers every request with the JSON body and status. */
function answering(body: unknown, status = 200): typeof fetch {
  return async () => Response.json(body, { status });
}

const unreachable: typeof fetch = async () => {
  throw new TypeError("Failed to fetch");
};

describe("resolveServedServer", () => {
  describe("with a pairing code in the fragment", () => {
    it("keeps the server and the token it gives", async () => {
      const storage = createMemoryStorage();
      const { location } = locationWith("#pair=123456");
      await resolveServedServer(
        location,
        answering({ token: "launch-token" }),
        storage,
        false,
      );
      expect(JSON.parse(storage.getItem("easyimmerse.server") ?? "")).toEqual({
        serverUrl: origin,
        token: "launch-token",
      });
    });

    it("loads the page again without the fragment", async () => {
      const { location, loaded } = locationWith("#pair=123456");
      await resolveServedServer(
        location,
        answering({ token: "launch-token" }),
        createMemoryStorage(),
        false,
      );
      expect(loaded).toEqual([`${origin}/`]);
    });

    it("reports a code the server refused", async () => {
      const { location } = locationWith("#pair=123456");
      const outcome = await resolveServedServer(
        location,
        answering({ code: "pairing_code_invalid", message: "wrong" }, 404),
        createMemoryStorage(),
        true,
      );
      expect(outcome).toEqual({
        kind: "pairingFailed",
        serverUrl: origin,
        code: "123456",
        failure: {
          status: 404,
          code: "pairing_code_invalid",
          message: "wrong",
        },
      });
    });

    it("reports a token it could not keep", async () => {
      const { location } = locationWith("#pair=123456");
      const outcome = await resolveServedServer(
        location,
        answering({ token: "launch-token" }),
        null,
        false,
      );
      expect(outcome.kind).toBe("pairingFailed");
    });
  });

  describe("without a pairing code", () => {
    it("asks the origin what it offers when the app has no server", async () => {
      const info = { accounts: true, open_signup: false };
      const outcome = await resolveServedServer(
        locationWith("").location,
        answering(info),
        createMemoryStorage(),
        false,
      );
      expect(outcome).toEqual({ kind: "serverFound", serverUrl: origin, info });
    });

    it("finds nothing at an origin that is not an easyImmerse server", async () => {
      const outcome = await resolveServedServer(
        locationWith("").location,
        answering("<!doctype html>"),
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
        answering({ accounts: true, open_signup: true }),
        createMemoryStorage(),
        true,
      );
      expect(outcome).toEqual({ kind: "none" });
    });
  });
});

describe("servedServerActions", () => {
  it("fills in the sign-in form for a server with accounts", () => {
    expect(
      servedServerActions({
        kind: "serverFound",
        serverUrl: origin,
        info: { accounts: true, open_signup: false },
      }),
    ).toEqual([
      actions.signInFormChanged({ serverChoice: "own", ownServerUrl: origin }),
    ]);
  });

  it("fills in the pairing address for a server without accounts", () => {
    expect(
      servedServerActions({
        kind: "serverFound",
        serverUrl: origin,
        info: { accounts: false, open_signup: false },
      }),
    ).toEqual([actions.pairingFormChanged({ address: origin })]);
  });

  it("opens the pairing page after a failed pairing", () => {
    const failure = { status: "NETWORK", message: "" } as const;
    expect(
      servedServerActions({
        kind: "pairingFailed",
        serverUrl: origin,
        code: "123456",
        failure,
      }).at(-1),
    ).toEqual(actions.navigated({ type: "openPairing" }));
  });
});
