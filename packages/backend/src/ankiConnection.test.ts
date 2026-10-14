import { describe, expect, it } from "vitest";
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
      data: { connected: false },
    });
  });
});
