import { actions, cacheKey } from "@easyimmerse/state";
import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createFakeBackendClient } from "../testSupport/createFakeBackendClient.ts";
import {
  fixtureProject,
  fixtureResponses,
} from "../testSupport/fixtureResponses.ts";
import { fakeServer } from "../testSupport/mediaFixtureResponses.ts";
import { savedFlashcard } from "../testSupport/renderMediaScreen.tsx";
import { renderWithAppStore } from "../testSupport/renderWithAppStore.tsx";
import { ProjectScreen } from "./ProjectScreen.tsx";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

/** Renders the overview of p1, which holds one flashcard never exported, over a server that writes packages and turns AnkiConnect on. */
function renderOverview() {
  const client = createFakeBackendClient({
    ...fixtureResponses,
    "GET /dictionaries": { dictionaries: [] },
    "GET /projects/p1/flashcards": { flashcards: [savedFlashcard] },
    "POST /projects/p1/anki/package": {
      flashcard_count: 1,
      skipped_media_count: 0,
    },
    "PUT /projects/p1/anki-connect": {
      ...fixtureProject,
      uses_anki_connect: true,
    },
  });
  const rendered = renderWithAppStore(
    <ProjectScreen
      projectId="p1"
      onBack={() => undefined}
      onEditSettings={() => undefined}
    />,
    client,
    { server: fakeServer },
  );
  act(() =>
    rendered.store.dispatch(
      actions.navigated({ type: "openProject", projectId: "p1" }),
    ),
  );
  return { ...rendered, client };
}

/** Exports the card through the dialog to the path the platform picks. */
async function exportToPath({ effects }: ReturnType<typeof renderOverview>) {
  fireEvent.click(
    await screen.findByRole("button", { name: /Export an Anki deck/ }),
  );
  fireEvent.click(await screen.findByRole("button", { name: "Export 1 card" }));
  await vi.waitFor(() =>
    expect(effects.calls).toContainEqual({
      type: "pickSavePath",
      suggestedFileName: "Alpha.apkg",
    }),
  );
  act(() =>
    effects.resolvePickSavePath({ kind: "path", path: "/decks/Alpha.apkg" }),
  );
}

/** Whether the server cache still holds the project, from which the automatic send to Anki reads whether it uses AnkiConnect. */
const holdsProject = (store: ReturnType<typeof renderOverview>["store"]) =>
  store.getState().backend.queries[cacheKey("getProject", "p1")] !== undefined;

/** Lets more than a minute pass under fake timers, after which an entry no component reads would ordinarily leave the server cache. */
const passAMinute = () => act(() => vi.advanceTimersByTime(61_000));

describe("ProjectScreen's ways to Anki", () => {
  it("keeps the project cached while one of its media files is open, so that a save there is still sent to Anki", async () => {
    const { store } = renderOverview();
    await screen.findByRole("heading", { name: "Flashcards" });
    vi.useFakeTimers();
    act(() => store.dispatch(actions.openMediaFileRequested("p1", "m1")));
    await vi.waitFor(() =>
      expect(screen.queryByRole("heading", { name: "Flashcards" })).toBeNull(),
    );
    passAMinute();
    expect(holdsProject(store)).toBe(true);
  });

  it("keeps the project cached a minute after nothing shows it, so that a save retried later is still sent to Anki", async () => {
    const { store } = renderOverview();
    await screen.findByRole("heading", { name: "Flashcards" });
    vi.useFakeTimers();
    cleanup();
    passAMinute();
    expect(holdsProject(store)).toBe(true);
  });

  it("has the server write the package at the picked path", async () => {
    const rendered = renderOverview();
    await exportToPath(rendered);
    await vi.waitFor(() =>
      expect(
        rendered.client.requests.find(
          ({ path }) => path === "/projects/p1/anki/package",
        )?.body,
      ).toEqual({
        kind: "json",
        value: {
          flashcard_ids: ["f1"],
          save_path: "/decks/Alpha.apkg",
          marks_exported: true,
          staged: false,
        },
      }),
    );
  });

  it("says how many cards were exported", async () => {
    const rendered = renderOverview();
    await exportToPath(rendered);
    expect(
      await screen.findByText("Exported 1 flashcard to an Anki package."),
    ).toBeDefined();
  });

  it("turns AnkiConnect on once it is set up", async () => {
    vi.stubGlobal("fetch", () => Promise.reject(new TypeError("refused")));
    const { client } = renderOverview();
    fireEvent.click(
      await screen.findByRole("button", { name: /Set up AnkiConnect/ }),
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "Connect to Anki" }),
    );
    await vi.waitFor(() =>
      expect(
        client.requests.find(({ path }) => path === "/projects/p1/anki-connect")
          ?.body,
      ).toEqual({ kind: "json", value: { uses_anki_connect: true } }),
    );
  });
});
