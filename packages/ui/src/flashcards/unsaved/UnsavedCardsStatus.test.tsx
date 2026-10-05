import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { NavigationActionsContext } from "../../navigationContext.ts";
import { createNoticeStore } from "../../notices/noticeStore.ts";
import { AppStoreProviders } from "../../testSupport/AppStoreProviders.tsx";
import { createTestAppStore } from "../../testSupport/createTestAppStore.ts";
import { exampleUnsavedCard } from "./exampleUnsavedCard.ts";
import {
  createUnsavedCardStore,
  type UnsavedCard,
} from "./unsavedCardStore.ts";

afterEach(cleanup);

/** Renders the app's providers, whose notice region shows the status line, over the given unsaved cards. */
function renderStatus(...cards: UnsavedCard[]) {
  const { store, playerRegistry } = createTestAppStore();
  const unsavedCardStore = createUnsavedCardStore();
  const noticeStore = createNoticeStore();
  const openedMediaFiles: string[] = [];
  for (const card of cards) unsavedCardStore.put(card);
  render(
    <NavigationActionsContext
      value={{
        openSettings: () => undefined,
        openDictionaries: () => undefined,
        openMediaFile: (projectId, mediaFileId) =>
          openedMediaFiles.push(`${projectId}/${mediaFileId}`),
      }}
    >
      <AppStoreProviders
        store={store}
        playerRegistry={playerRegistry}
        noticeStore={noticeStore}
        unsavedCardStore={unsavedCardStore}
      >
        <p>Screen</p>
      </AppStoreProviders>
    </NavigationActionsContext>,
  );
  return { unsavedCardStore, noticeStore, openedMediaFiles };
}

const status = () =>
  within(screen.getByRole("region", { name: "Notifications" })).getByRole(
    "status",
  );

const expand = () =>
  fireEvent.click(screen.getByRole("button", { name: "Show" }));

describe("UnsavedCardsStatus", () => {
  it("counts the flashcards not saved", () => {
    renderStatus(exampleUnsavedCard("Hund"), exampleUnsavedCard("Katze"));
    expect(status().textContent).toBe("2 flashcards not saved");
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

  it("sends a flashcard again on its Retry", () => {
    const retries: string[] = [];
    renderStatus(
      exampleUnsavedCard("Hund", { retry: () => retries.push("Hund") }),
    );
    expand();
    fireEvent.click(screen.getByRole("button", { name: "Retry “Hund”" }));
    expect(retries).toEqual(["Hund"]);
  });

  it("sends every flashcard again on Retry all", () => {
    const retries: string[] = [];
    renderStatus(
      exampleUnsavedCard("Hund", { retry: () => retries.push("Hund") }),
      exampleUnsavedCard("Katze", { retry: () => retries.push("Katze") }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Retry all" }));
    expect(retries).toEqual(["Hund", "Katze"]);
  });

  it("offers no Retry for a flashcard the server refused", () => {
    renderStatus(exampleUnsavedCard("Hund", { isRejected: true }));
    expand();
    expect(screen.queryByRole("button", { name: "Retry “Hund”" })).toBeNull();
  });

  it("opens a flashcard's media file on its Open", () => {
    const { openedMediaFiles } = renderStatus(exampleUnsavedCard("Hund"));
    expand();
    fireEvent.click(screen.getByRole("button", { name: "Open “Hund”" }));
    expect(openedMediaFiles).toEqual(["p1/m1"]);
  });

  describe("on Discard", () => {
    function discardHund() {
      const discards: string[] = [];
      const rendered = renderStatus(
        exampleUnsavedCard("Hund", { discard: () => discards.push("Hund") }),
      );
      expand();
      fireEvent.click(screen.getByRole("button", { name: "Discard “Hund”" }));
      return { ...rendered, discards };
    }

    it("takes the flashcard off the list", () => {
      discardHund();
      expect(status().textContent).toBe("");
    });

    it("takes back what a save of it may have left", () => {
      const { discards } = discardHund();
      expect(discards).toEqual(["Hund"]);
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
