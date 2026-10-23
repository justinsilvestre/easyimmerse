import { actions } from "@easyimmerse/state";
import type { Flashcard } from "@easyimmerse/types";
import {
  act,
  cleanup,
  fireEvent,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { exampleFlashcard } from "../flashcards/exampleFlashcard.ts";
import {
  exampleLibraryItem,
  exampleLibraryMediaFile,
  exampleLibraryVideoText,
} from "../library/exampleLibrary.ts";
import {
  createFakeBackendClient,
  type FakeResponse,
  fakeFailure,
} from "../testSupport/createFakeBackendClient.ts";
import { doubleClick } from "../testSupport/doubleClick.ts";
import { fixtureResponses } from "../testSupport/fixtureResponses.ts";
import {
  directPlaybackRoutes,
  fakeServer,
} from "../testSupport/mediaFixtureResponses.ts";
import {
  bodyOf,
  dictionarySummary,
  requestsTo,
} from "../testSupport/renderMediaScreen.tsx";
import { renderWithAppStore } from "../testSupport/renderWithAppStore.tsx";
import { ProjectScreen } from "./ProjectScreen.tsx";

afterEach(cleanup);

const libraryFlashcard: Flashcard = {
  id: "f9",
  project_id: "p1",
  media_file_id: "m3",
  cue_index: 0,
  word_start: 4,
  content: { ...exampleFlashcard, word: "Hund", l1_definition: "dog" },
  included_fields: ["word", "l1_definition"],
  created_at_ms: 0,
  updated_at_ms: 0,
  exported_at_ms: null,
  was_packaged: false,
  sent_at_ms: null,
  is_suspended: false,
  is_from_library: true,
};

/** Renders project p1 with its library media file m3 open, the video item i1, over a server with German dictionaries. */
function renderLibraryVideo(
  flashcards: Flashcard[] = [],
  responses: Record<string, FakeResponse> = {},
) {
  const client = createFakeBackendClient(
    {
      ...fixtureResponses,
      "GET /dictionaries": {
        dictionaries: [dictionarySummary("wiktionary-de-en", "de", "en")],
      },
      "GET /projects/p1/media": { media_files: [exampleLibraryMediaFile] },
      "GET /projects/p1/flashcards": { flashcards },
      "GET /library/items/i1": exampleLibraryItem(),
      "GET /library/items/i1/text": exampleLibraryVideoText,
      "POST /projects/p1/media/m3/library-flashcards": libraryFlashcard,
      ...responses,
    },
    directPlaybackRoutes,
  );
  const rendered = renderWithAppStore(
    <ProjectScreen
      projectId="p1"
      onBack={() => undefined}
      onEditSettings={() => undefined}
    />,
    client,
    { server: fakeServer },
  );
  act(() => {
    rendered.store.dispatch(actions.preferencesLoaded({}));
    rendered.store.dispatch(actions.openMediaFileRequested("p1", "m3"));
  });
  return client;
}

/** Finds the first occurrence of a word in the subtitles panel. */
async function findPanelWord(word: string) {
  const list = await screen.findByRole("list", { name: "Subtitles" });
  const [first] = await within(list).findAllByRole("button", { name: word });
  return first as HTMLElement;
}

describe("ProjectScreen with a media file from the library", () => {
  it("makes only the words the library stores clickable", async () => {
    renderLibraryVideo();
    await findPanelWord("Hund");
    const list = screen.getByRole("list", { name: "Subtitles" });
    expect(within(list).queryByRole("button", { name: "Nacht" })).toBeNull();
  });

  describe("when a word is clicked", () => {
    it("shows the word's stored entry", async () => {
      renderLibraryVideo();
      fireEvent.click(await findPanelWord("Hund"), { detail: 1 });
      const popup = await screen.findByRole("dialog", { name: "Dictionary" });
      await waitFor(() => expect(popup.textContent).toContain("ein Haustier"));
    });

    it("looks nothing up on the server", async () => {
      const client = renderLibraryVideo();
      fireEvent.click(await findPanelWord("Hund"), { detail: 1 });
      await screen.findByRole("dialog", { name: "Dictionary" });
      expect(
        client.requests.filter(({ path }) =>
          path.startsWith("/dictionaries/lookup"),
        ),
      ).toEqual([]);
    });
  });

  it("makes a library flashcard of a double-clicked word", async () => {
    const client = renderLibraryVideo();
    doubleClick(await findPanelWord("Hund"));
    await waitFor(() =>
      expect(
        bodyOf(
          requestsTo(
            client.requests,
            "POST",
            "/projects/p1/media/m3/library-flashcards",
          )[0],
        ),
      ).toMatchObject({ segment_index: 0, word_start: 4 }),
    );
  });

  describe("when a library flashcard is opened", () => {
    async function openFlashcard() {
      renderLibraryVideo([libraryFlashcard]);
      await findPanelWord("Hund");
      fireEvent.click(
        await screen.findByRole("button", { name: "Open the flashcard" }),
      );
    }

    it("shows it as it is reviewed", async () => {
      await openFlashcard();
      expect(
        await screen.findByRole("article", { name: "Flashcard preview" }),
      ).toBeDefined();
    });

    it("offers no way to edit it", async () => {
      await openFlashcard();
      await screen.findByRole("article", { name: "Flashcard preview" });
      expect(screen.queryByRole("button", { name: "Save" })).toBeNull();
    });
  });

  describe("when the item cannot be read", () => {
    it("says a deleted item is no longer available", async () => {
      renderLibraryVideo([], {
        "GET /library/items/i1": fakeFailure({ status: 404, message: "" }),
      });
      expect((await screen.findByRole("alert")).textContent).toBe(
        "This library item is no longer available.",
      );
    });

    it("says the item could not be loaded for any other failure", async () => {
      renderLibraryVideo([], {
        "GET /library/items/i1": fakeFailure({ status: 500, message: "" }),
      });
      expect((await screen.findByRole("alert")).textContent).toBe(
        "This library item could not be loaded.",
      );
    });
  });
});
