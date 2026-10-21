import { describe, expect, it } from "vitest";
import { actions } from "../app/appAction.ts";
import type { AppState } from "../app/appState.ts";
import {
  appAfter,
  hund,
  typeWord,
} from "../flashcards/flashcardsTestSupport.ts";
import { selectIsWorkNotBackedUp } from "./selectIsWorkNotBackedUp.ts";

const withChangedHund = () =>
  appAfter(actions.flashcardOpened("h", hund), typeWord("Hündin"));

const connected = (app: AppState): AppState => ({
  ...app,
  server: {
    config: { serverUrl: "https://books.example.org", token: "t" },
    cloudUrl: null,
  },
});

describe("selectIsWorkNotBackedUp", () => {
  it("tells of flashcards kept only on the device while the app runs without a server", () => {
    expect(selectIsWorkNotBackedUp({ app: withChangedHund() })).toBe(true);
  });

  it("tells of nothing while no flashcard waits to be saved", () => {
    expect(selectIsWorkNotBackedUp({ app: appAfter() })).toBe(false);
  });

  it("tells of nothing while the app is connected to a server", () => {
    expect(selectIsWorkNotBackedUp({ app: connected(withChangedHund()) })).toBe(
      false,
    );
  });
});
