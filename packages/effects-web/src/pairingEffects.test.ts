import { describe, expect, it } from "vitest";
import { createPairingEffects } from "./pairingEffects.ts";

const serverUrl = "http://192.168.1.5:8787";

/** A fetch that records each request and answers it with the JSON body and status. */
function answering(body: unknown, status = 200) {
  const requests: Request[] = [];
  const fetchFn: typeof fetch = async (input, init) => {
    requests.push(new Request(input, init));
    return Response.json(body, { status });
  };
  return { fetchFn, requests };
}

describe("createPairingEffects", () => {
  describe("claimPairingCode", () => {
    it("posts the code to the server's claim route", async () => {
      const { fetchFn, requests } = answering({ token: "launch-token" });
      await createPairingEffects(fetchFn).claimPairingCode(serverUrl, "123456");
      expect(await requests[0]?.json()).toEqual({ code: "123456" });
    });

    it("sends the claim to the pairing route", async () => {
      const { fetchFn, requests } = answering({ token: "launch-token" });
      await createPairingEffects(fetchFn).claimPairingCode(serverUrl, "123456");
      expect(requests[0]?.url).toBe(`${serverUrl}/pairing/claim`);
    });

    it("resolves with the token the server gives", async () => {
      const { fetchFn } = answering({ token: "launch-token" });
      expect(
        await createPairingEffects(fetchFn).claimPairingCode(serverUrl, "1"),
      ).toEqual({ ok: true, data: { token: "launch-token" } });
    });

    it("resolves with the server's refusal", async () => {
      const { fetchFn } = answering(
        { code: "pairing_code_invalid", message: "wrong" },
        404,
      );
      const outcome = await createPairingEffects(fetchFn).claimPairingCode(
        serverUrl,
        "1",
      );
      expect(outcome.ok || outcome.error.code).toBe("pairing_code_invalid");
    });
  });

  it("scans nothing, since a browser has no scanner of its own", async () => {
    const { fetchFn } = answering({});
    expect(await createPairingEffects(fetchFn).scanPairingCode()).toBeNull();
  });
});
