import { describe, expect, it } from "vitest";
import { createBackgroundLookUp } from "./backgroundLookUp.ts";

const query = { text: "Hund", language: "de" };

describe("createBackgroundLookUp", () => {
  it("sends the query to the background script", async () => {
    const sent: unknown[] = [];
    const lookUp = createBackgroundLookUp(async (message) => {
      sent.push(message);
      return { data: { results: [], kanji: [], stylesheets: [] } };
    });
    await lookUp(query);
    expect(sent).toEqual([{ kind: "lookUpText", query }]);
  });

  it("answers with a failure when the message cannot be sent", async () => {
    const lookUp = createBackgroundLookUp(async () => {
      throw new Error("Extension context invalidated.");
    });
    const answer = await lookUp(query);
    expect("error" in answer && answer.error.status).toBe("NETWORK");
  });

  it("answers with a failure when no listener answers", async () => {
    const lookUp = createBackgroundLookUp(async () => undefined);
    const answer = await lookUp(query);
    expect("error" in answer && answer.error.status).toBe("NETWORK");
  });
});
