import type { BackendRequest } from "@easyimmerse/backend";
import { resetBackend } from "@easyimmerse/backend";
import { actions, selectLookup } from "@easyimmerse/state";
import { act, cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { createFakeBackendClient } from "../testSupport/createFakeBackendClient.ts";
import { fixtureLookupResults } from "../testSupport/fixtureLookup.ts";
import { fixtureResponses } from "../testSupport/fixtureResponses.ts";
import { renderWithAppStore } from "../testSupport/renderWithAppStore.tsx";
import { useAppSelector } from "./useAppSelector.ts";
import { useTermLookup } from "./useTermLookup.ts";

afterEach(() => {
  cleanup();
  resetBackend();
  renderedStatuses.length = 0;
});

/** Every status rendered while the lookup was open, so that a test can check that none flashed by. */
const renderedStatuses: string[] = [];

function LookupProbe() {
  const { results, status, hasDictionaries } = useTermLookup("de");
  const isOpen = useAppSelector(selectLookup).kind === "open";
  if (isOpen) renderedStatuses.push(status);
  return (
    <p>
      {status} {String(hasDictionaries)}{" "}
      {results.map((result) => result.dictionary.title).join(", ")}
    </p>
  );
}

/** Finds entries only for the term as written with a capital letter, as German nouns are. */
const lookUpCapitalized = (request: BackendRequest) => ({
  results: request.query?.term === "Katze" ? fixtureLookupResults : [],
});

function renderLookup(responses = {}) {
  const client = createFakeBackendClient({
    ...fixtureResponses,
    "GET /dictionaries/lookup": lookUpCapitalized,
    ...responses,
  });
  const { store } = renderWithAppStore(<LookupProbe />, client);
  act(() => {
    store.dispatch(
      actions.wordHovered({ word: "Katze", context: null, clip: null }),
    );
  });
  return client;
}

const lookedUpTerms = (requests: BackendRequest[]) =>
  requests
    .filter((request) => request.path === "/dictionaries/lookup")
    .map((request) => request.query?.term);

describe("useTermLookup", () => {
  it("looks the term up in lower case first, then as written", async () => {
    const client = renderLookup();
    await screen.findByText(/German–English Wiktionary/);
    expect(lookedUpTerms(client.requests)).toEqual(["katze", "Katze"]);
  });

  it("shows the results for the term as written when lower case finds nothing", async () => {
    renderLookup();
    expect(
      await screen.findByText(
        "idle true German–English Wiktionary, Deutsches Wörterbuch",
      ),
    ).toBeTruthy();
  });

  it("keeps loading between the lower-case lookup and the lookup as written", async () => {
    renderLookup();
    await screen.findByText(/German–English Wiktionary/);
    expect(renderedStatuses.slice(0, -1)).not.toContain("idle");
  });

  it("tells that no dictionary covers the target language", async () => {
    renderLookup({ "GET /dictionaries": { dictionaries: [] } });
    expect(await screen.findByText(/false/)).toBeTruthy();
  });
});
