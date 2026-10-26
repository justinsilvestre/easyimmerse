import { actions } from "@easyimmerse/state";
import type { Flashcard, LibraryItemStatus } from "@easyimmerse/types";
import {
  act,
  cleanup,
  fireEvent,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { exampleResults } from "../../components/dictionaryPopup/exampleLookup.ts";
import { exampleFlashcard } from "../../components/flashcards/exampleFlashcard.ts";
import {
  createFakeBackendClient,
  type FakeResponse,
  fakeFailure,
} from "../../testSupport/createFakeBackendClient.ts";
import { doubleClick } from "../../testSupport/doubleClick.ts";
import {
  exampleLibraryItem,
  exampleLibraryMediaFile,
  exampleLibraryVideoText,
} from "../../testSupport/exampleLibrary.ts";
import { fixtureResponses } from "../../testSupport/fixtureResponses.ts";
import {
  directPlaybackRoutes,
  fakeServer,
} from "../../testSupport/mediaFixtureResponses.ts";
import {
  bodyOf,
  dictionarySummary,
  requestsTo,
} from "../../testSupport/renderMediaScreen.tsx";
import { renderWithAppStore } from "../../testSupport/renderWithAppStore.tsx";
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

/** Renders project p1 with its library media file m3 open, the video item i1, over a server with German dictionaries, returning its client. */
function renderLibraryVideo(
  flashcards: Flashcard[] = [],
  responses: Record<string, FakeResponse> = {},
) {
  return renderLibraryVideoWithStore(flashcards, responses).client;
}

/** Renders the library video as `renderLibraryVideo` does, returning the store along with the client. */
function renderLibraryVideoWithStore(
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
    <ProjectScreen projectId="p1" />,
    client,
    { server: fakeServer },
  );
  act(() => {
    rendered.store.dispatch(actions.preferencesLoaded({}));
    rendered.store.dispatch(actions.openMediaFileRequested("p1", "m3"));
  });
  return { ...rendered, client };
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

  it("offers no subtitles file to add", async () => {
    renderLibraryVideo();
    await findPanelWord("Hund");
    expect(
      screen.queryByRole("button", { name: "Add a subtitles file" }),
    ).toBeNull();
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

  describe("with a library flashcard", () => {
    async function openFlashcardMenu() {
      const client = renderLibraryVideo([libraryFlashcard], {
        "PUT /projects/p1/review/holds/f9": null,
        "DELETE /projects/p1/flashcards/f9": null,
      });
      fireEvent.click(
        await screen.findByRole("button", { name: "Flashcard actions" }),
      );
      return client;
    }

    async function askToDelete() {
      const client = await openFlashcardMenu();
      fireEvent.click(
        screen.getByRole("menuitem", { name: "Delete flashcard" }),
      );
      return client;
    }

    it("offers no way to open it", async () => {
      renderLibraryVideo([libraryFlashcard]);
      await screen.findByRole("button", { name: "Flashcard actions" });
      expect(
        screen.queryByRole("button", { name: "Open the flashcard" }),
      ).toBeNull();
    });

    it("keeps the subtitles panel when asked to open it, opening no editor in its place", async () => {
      const { store } = renderLibraryVideoWithStore([libraryFlashcard]);
      await screen.findByRole("button", { name: "Flashcard actions" });
      act(() => {
        store.dispatch(actions.flashcardOpened("f9", libraryFlashcard));
      });
      expect(screen.queryByRole("list", { name: "Subtitles" })).not.toBeNull();
    });

    it("suspends it from its menu", async () => {
      const client = await openFlashcardMenu();
      fireEvent.click(screen.getByRole("menuitem", { name: "Suspend" }));
      await waitFor(() =>
        expect(
          requestsTo(client.requests, "PUT", "/projects/p1/review/holds/f9"),
        ).toHaveLength(1),
      );
    });

    it("asks for confirmation before deleting it", async () => {
      await askToDelete();
      expect(
        await screen.findByRole("dialog", { name: "Delete this flashcard?" }),
      ).toBeDefined();
    });

    it("deletes it once confirmed", async () => {
      const client = await askToDelete();
      const dialog = await screen.findByRole("dialog", {
        name: "Delete this flashcard?",
      });
      fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));
      await waitFor(() =>
        expect(
          requestsTo(client.requests, "DELETE", "/projects/p1/flashcards/f9"),
        ).toHaveLength(1),
      );
    });
  });

  describe("when the item cannot be read", () => {
    it("says a deleted item is no longer available", async () => {
      renderLibraryVideo([], {
        "GET /library/items/i1": fakeFailure({ status: 404, message: "" }),
      });
      expect((await screen.findByRole("alert")).textContent).toBe(
        "This item is no longer in the library. It may have been deleted, or taken out of the library for now.",
      );
    });

    it("says the item could not be loaded for any other failure", async () => {
      renderLibraryVideo([], {
        "GET /library/items/i1": fakeFailure({ status: 500, message: "" }),
      });
      expect((await screen.findByRole("alert")).textContent).toBe(
        "This library item couldn't be loaded. Try again in a moment.",
      );
    });
  });
});

describe("ProjectScreen with an unpublished library item open for its library manager", () => {
  /** Renders the draft video item i1 for the server's owner, whose dictionaries find the example results for every word. */
  function renderPreparation() {
    return renderLibraryVideo([], {
      "GET /auth/me": { kind: "launch" },
      "GET /library/items/i1": exampleLibraryItem({
        status: { kind: "draft" },
      }),
      "GET /dictionaries/lookup": {
        results: [...exampleResults],
        kanji: [],
        stylesheets: [],
      },
      "PUT /library/items/i1/segments/0/words":
        exampleLibraryVideoText.segments[0],
      "PUT /library/items/i1/segments/2/words":
        exampleLibraryVideoText.segments[2],
    });
  }

  /** The words the screen saved for a segment, once it saves them. */
  async function savedWords(
    client: ReturnType<typeof renderPreparation>,
    segmentIndex: number,
  ) {
    const path = `/library/items/i1/segments/${segmentIndex}/words`;
    await waitFor(() =>
      expect(requestsTo(client.requests, "PUT", path)).toHaveLength(1),
    );
    return bodyOf(requestsTo(client.requests, "PUT", path)[0]);
  }

  /** Chooses the first of the dictionaries' entries for learners in the open pop-up. */
  async function useFirstEntry() {
    const popup = await screen.findByRole("dialog", { name: "Dictionary" });
    const [use] = await within(popup).findAllByRole("button", {
      name: "Use this entry for learners",
    });
    fireEvent.click(use as HTMLElement);
  }

  /** Selects the text of a cue in the subtitles panel from one offset to another, and ends the selection with a click. */
  async function selectInPanel(word: string, from: number, to: number) {
    const root = (await findPanelWord(word)).parentElement as HTMLElement;
    const range = document.createRange();
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let offset = 0;
    while (walker.nextNode()) {
      const node = walker.currentNode as Text;
      if (from >= offset && from <= offset + node.length)
        range.setStart(node, from - offset);
      if (to >= offset && to <= offset + node.length)
        range.setEnd(node, to - offset);
      offset += node.length;
    }
    document.getSelection()?.removeAllRanges();
    document.getSelection()?.addRange(range);
    fireEvent.click(root, { detail: 1 });
  }

  it("makes every word clickable", async () => {
    renderPreparation();
    expect(await findPanelWord("Nacht")).toBeDefined();
  });

  it("gives a clicked word the entry chosen for learners", async () => {
    const client = renderPreparation();
    fireEvent.click(await findPanelWord("Nacht"), { detail: 1 });
    await useFirstEntry();
    expect(await savedWords(client, 2)).toMatchObject([
      { start: 5, end: 10, entry: { term: "fressen" } },
    ]);
  });

  it("gives selected text the entry chosen for learners", async () => {
    const client = renderPreparation();
    await selectInPanel("Nacht", 0, 10);
    await useFirstEntry();
    expect(await savedWords(client, 2)).toMatchObject([
      { start: 0, end: 10, entry: { term: "fressen" } },
    ]);
  });

  it("shows a stored word's entry as learners see it", async () => {
    renderPreparation();
    fireEvent.click(await findPanelWord("Hund"), { detail: 1 });
    const forLearners = await screen.findByRole("region", {
      name: "For learners",
    });
    expect(forLearners.textContent).toContain("ein Haustier");
  });

  it("removes a stored word", async () => {
    const client = renderPreparation();
    fireEvent.click(await findPanelWord("Hund"), { detail: 1 });
    fireEvent.click(
      await screen.findByRole("button", { name: "Remove the word" }),
    );
    expect(
      ((await savedWords(client, 0)) as { start: number }[]).map(
        ({ start }) => start,
      ),
    ).toEqual([0, 9]);
  });

  it("makes no flashcard of a double-clicked word", async () => {
    const client = renderPreparation();
    doubleClick(await findPanelWord("Hund"));
    await screen.findByRole("dialog", { name: "Dictionary" });
    expect(
      requestsTo(
        client.requests,
        "POST",
        "/projects/p1/media/m3/library-flashcards",
      ),
    ).toEqual([]);
  });
});

describe("ProjectScreen with a library item open for its library manager", () => {
  /** Renders the video item i1 in the status for the server's owner. */
  function renderForManager(status: LibraryItemStatus) {
    return renderLibraryVideo([], {
      "GET /auth/me": { kind: "launch" },
      "GET /library/items/i1": exampleLibraryItem({ status }),
    });
  }

  it("prepares the words of a published item, making every word clickable", async () => {
    renderForManager({ kind: "published" });
    expect(await findPanelWord("Nacht")).toBeDefined();
  });

  it("does not prepare the words of an item being published", async () => {
    renderForManager({ kind: "processing" });
    await findPanelWord("Hund");
    const list = screen.getByRole("list", { name: "Subtitles" });
    expect(within(list).queryByRole("button", { name: "Nacht" })).toBeNull();
  });
});
