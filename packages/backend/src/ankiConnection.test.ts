import { describe, expect, it } from "vitest";
import { AnkiConnectError } from "./ankiConnectError.ts";
import { checkAnkiConnection } from "./ankiConnection.ts";
import { createFakeAnkiConnect } from "./fakeAnkiConnect.ts";

describe("checkAnkiConnection", () => {
  it("is connected, with AnkiConnect's version, once Anki answers", async () => {
    const anki = createFakeAnkiConnect({ version: () => 6 });
    expect(await checkAnkiConnection(anki)).toEqual({
      data: { connected: true, version: 6 },
    });
  });

  it("is not connected while Anki does not answer", async () => {
    expect(await checkAnkiConnection(createFakeAnkiConnect())).toEqual({
      data: { connected: false, isDenied: false },
    });
  });

  it("is not connected, and denied, once Anki refuses easyImmerse", async () => {
    const anki = createFakeAnkiConnect({
      version: () => {
        throw new AnkiConnectError({ kind: "denied" });
      },
    });
    expect(await checkAnkiConnection(anki)).toEqual({
      data: { connected: false, isDenied: true },
    });
  });
});
