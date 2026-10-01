import { describe, expect, it } from "vitest";
import { actions } from "../actions.ts";
import { createAppState } from "../testSupport/createAppState.ts";
import { update } from "../update.ts";

const bytes = new Uint8Array([1, 2, 3]);

const position = { chapterIndex: 2, paragraphIndex: 5 };

const documentOpen = () =>
  createAppState(
    {},
    { screen: { kind: "media", projectId: "p1", mediaId: "m1" } },
  );

describe("update", () => {
  it("stores the open document's bytes for documentBytesRead", () => {
    const [state] = update(
      documentOpen(),
      actions.documentBytesRead("m1", bytes),
    );
    expect(state.reader.documentBytes).toEqual({ mediaId: "m1", bytes });
  });

  it("ignores documentBytesRead for media no longer open", () => {
    const [state] = update(
      documentOpen(),
      actions.documentBytesRead("m2", bytes),
    );
    expect(state.reader.documentBytes).toBeNull();
  });

  it("keeps the reading position for readingPositionChanged", () => {
    const [state] = update(
      documentOpen(),
      actions.readingPositionChanged("m1", position),
    );
    expect(state.reader.position).toEqual(position);
  });

  it("ignores readingPositionChanged for media no longer open", () => {
    const [state] = update(
      documentOpen(),
      actions.readingPositionChanged("m2", position),
    );
    expect(state.reader.position).toBeNull();
  });
});
