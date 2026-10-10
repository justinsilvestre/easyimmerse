import type { BackendRequest } from "@easyimmerse/backend";
import {
  type AppStore,
  selectCurrentMediaFileId,
  selectRoute,
} from "@easyimmerse/state";
import type { NewFlashcard } from "@easyimmerse/types";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createNoticeStore } from "../../notices/noticeStore.ts";
import { AppStoreProviders } from "../../testSupport/AppStoreProviders.tsx";
import { createFakeBackendClient } from "../../testSupport/createFakeBackendClient.ts";
import { createTestAppStore } from "../../testSupport/createTestAppStore.ts";
import { fixtureResponses } from "../../testSupport/fixtureResponses.ts";
import { savedFlashcard } from "../../testSupport/renderMediaScreen.tsx";
import { createSharedSaving } from "../sharedSaving.ts";
import { exampleUnsavedCard } from "./exampleUnsavedCard.ts";
import type { UnsavedCard } from "./unsavedCard.ts";

afterEach(cleanup);

/** A backend that records flashcard saves and answers them with success, or, when `savesHang`, never. */
function createSavingBackend(savesHang: boolean) {
  const backend = createFakeBackendClient({
    ...fixtureResponses,
    "POST /projects/p1/flashcards": savedFlashcard,
  });
  const saves: BackendRequest[] = [];
  const send = <T,>(request: BackendRequest) => {
    if (request.method !== "POST") return backend.send<T>(request);
    saves.push(request);
    if (savesHang) return new Promise<never>(() => undefined);
    return backend.send<T>(request);
  };
  return { saves, send };
}

/** Renders the app's providers, whose notice region shows the status line, over the given unsaved cards. */
function renderStatusOver(cards: UnsavedCard[], savesHang: boolean) {
  const backend = createSavingBackend(savesHang);
  const { store, playerRegistry } = createTestAppStore(backend);
  const sharedSaving = createSharedSaving();
  const unsavedCardStore = sharedSaving.unsavedCards;
  const noticeStore = createNoticeStore();
  for (const card of cards) unsavedCardStore.put(card);
  render(
    <AppStoreProviders
      store={store}
      playerRegistry={playerRegistry}
      noticeStore={noticeStore}
      sharedSaving={sharedSaving}
    >
      <p>Screen</p>
    </AppStoreProviders>,
  );
  const shownMediaFile = () => shownMediaFileOf(store);
  return { unsavedCardStore, shownMediaFile, saves: backend.saves };
}

/** The project and media file the store shows, as "projectId/mediaFileId", or null when no project is open. */
function shownMediaFileOf(store: AppStore): string | null {
  const route = selectRoute(store.getState());
  if (route.screen !== "project" && route.screen !== "media") return null;
  return `${route.projectId}/${selectCurrentMediaFileId(store.getState())}`;
}

/** Renders the status line over the given cards, with saves that succeed. */
const renderStatus = (...cards: UnsavedCard[]) =>
  renderStatusOver(cards, false);

/** The word each save request sent. */
const savedWords = (saves: BackendRequest[]) =>
  saves.map(
    (request) =>
      (request.body?.value as NewFlashcard | undefined)?.draft.content.word,
  );

/** The status line's count, the live paragraph of the notice region. */
const status = () => {
  const count = screen
    .getByRole("region", { name: "Notifications" })
    .querySelector("p[aria-live]");
  if (count === null) throw new Error("The status line has no count.");
  return count;
};

const expand = () =>
  fireEvent.click(screen.getByRole("button", { name: "Show" }));

describe("UnsavedCardsStatus", () => {
  it("counts the flashcards not saved", () => {
    renderStatus(exampleUnsavedCard("Hund"), exampleUnsavedCard("Katze"));
    expect(status().textContent).toBe("2 flashcards not saved");
  });

  it("announces its count politely", () => {
    renderStatus(exampleUnsavedCard("Hund"));
    expect(status().getAttribute("aria-live")).toBe("polite");
  });

  it("counts one flashcard in the singular", () => {
    renderStatus(exampleUnsavedCard("Hund"));
    expect(status().textContent).toBe("1 flashcard not saved");
  });

  it("keeps its live region, empty, while every flashcard is saved, so that it is announced once one is not", () => {
    renderStatus();
    expect(status().textContent).toBe("");
  });

  it("updates its count as a flashcard is added", () => {
    const { unsavedCardStore } = renderStatus(exampleUnsavedCard("Hund"));
    act(() => unsavedCardStore.put(exampleUnsavedCard("Katze")));
    expect(status().textContent).toBe("2 flashcards not saved");
  });

  it("lists the flashcards once expanded", () => {
    renderStatus(exampleUnsavedCard("Hund"), exampleUnsavedCard("Katze"));
    expand();
    expect(
      within(screen.getByRole("list", { name: "Flashcards not saved" }))
        .getAllByRole("listitem")
        .map((item) => item.textContent?.split("Retry")[0]),
    ).toEqual(["Hund", "Katze"]);
  });

  it("collapses the list with ×", () => {
    renderStatus(exampleUnsavedCard("Hund"));
    expand();
    fireEvent.click(screen.getByRole("button", { name: "Hide the list" }));
    expect(
      screen.queryByRole("list", { name: "Flashcards not saved" }),
    ).toBeNull();
  });

  it("keeps the flashcards listed once collapsed", () => {
    renderStatus(exampleUnsavedCard("Hund"));
    expand();
    fireEvent.click(screen.getByRole("button", { name: "Hide the list" }));
    expect(status().textContent).toBe("1 flashcard not saved");
  });

  it("sends a flashcard again on its Retry", async () => {
    const { saves } = renderStatus(exampleUnsavedCard("Hund"));
    expand();
    fireEvent.click(screen.getByRole("button", { name: "Retry “Hund”" }));
    await vi.waitFor(() => expect(savedWords(saves)).toEqual(["Hund"]));
  });

  it("sends every flashcard again on Retry all", async () => {
    const { saves } = renderStatus(
      exampleUnsavedCard("Hund"),
      exampleUnsavedCard("Katze"),
    );
    fireEvent.click(screen.getByRole("button", { name: "Retry all" }));
    await vi.waitFor(() =>
      expect(savedWords(saves)).toEqual(["Hund", "Katze"]),
    );
  });

  it("takes a flashcard off the list once its retry succeeds", async () => {
    renderStatus(exampleUnsavedCard("Hund"));
    expand();
    fireEvent.click(screen.getByRole("button", { name: "Retry “Hund”" }));
    await vi.waitFor(() => expect(status().textContent).toBe(""));
  });

  it("offers no Retry for a flashcard the server refused", () => {
    renderStatus(exampleUnsavedCard("Hund", { isRejected: true }));
    expand();
    expect(screen.queryByRole("button", { name: "Retry “Hund”" })).toBeNull();
  });

  describe("while a retry is under way", () => {
    function retryHund() {
      const rendered = renderStatusOver([exampleUnsavedCard("Hund")], true);
      expand();
      fireEvent.click(screen.getByRole("button", { name: "Retry “Hund”" }));
      return rendered;
    }

    const disabledOf = (name: string) =>
      screen.getByRole("button", { name }).getAttribute("aria-disabled");

    it("shows the flashcard as being saved", () => {
      retryHund();
      expect(screen.getByText("Hund (saving…)")).toBeDefined();
    });

    it("marks Discard unavailable", () => {
      retryHund();
      expect(disabledOf("Discard “Hund”")).toBe("true");
    });

    it("keeps the flashcard listed on Discard", () => {
      retryHund();
      fireEvent.click(screen.getByRole("button", { name: "Discard “Hund”" }));
      expect(status().textContent).toBe("1 flashcard not saved");
    });

    it("keeps Open available, since opening shows the content being sent", () => {
      retryHund();
      expect(disabledOf("Open “Hund”")).toBeNull();
    });

    it("opens the flashcard's media file on Open", () => {
      const { shownMediaFile } = retryHund();
      fireEvent.click(screen.getByRole("button", { name: "Open “Hund”" }));
      expect(shownMediaFile()).toBe("p1/m1");
    });
  });

  it("opens a flashcard's media file on its Open", () => {
    const { shownMediaFile } = renderStatus(exampleUnsavedCard("Hund"));
    expand();
    fireEvent.click(screen.getByRole("button", { name: "Open “Hund”" }));
    expect(shownMediaFile()).toBe("p1/m1");
  });

  it("keeps a flashcard listed on Open until its screen takes it", () => {
    renderStatus(exampleUnsavedCard("Hund"));
    expand();
    fireEvent.click(screen.getByRole("button", { name: "Open “Hund”" }));
    expect(status().textContent).toBe("1 flashcard not saved");
  });

  it("offers no Open for a flashcard without a media file", () => {
    renderStatus(exampleUnsavedCard("Hund", { mediaFileId: null }));
    expand();
    expect(screen.queryByRole("button", { name: "Open “Hund”" })).toBeNull();
  });

  describe("on Discard", () => {
    function discardHund() {
      const rendered = renderStatus(exampleUnsavedCard("Hund"));
      expand();
      fireEvent.click(screen.getByRole("button", { name: "Discard “Hund”" }));
      return rendered;
    }

    it("takes the flashcard off the list", () => {
      discardHund();
      expect(status().textContent).toBe("");
    });

    it("offers Undo in a notice", () => {
      discardHund();
      expect(
        screen.getByText("Discarded your changes to the flashcard for “Hund”."),
      ).toBeDefined();
    });

    it("lists the flashcard again on Undo", () => {
      discardHund();
      fireEvent.click(screen.getByRole("button", { name: "Undo" }));
      expect(status().textContent).toBe("1 flashcard not saved");
    });
  });
});
