import { actions, selectCurrentMediaFileId } from "@easyimmerse/state";
import type { Document, MediaFile } from "@easyimmerse/types";
import {
  act,
  cleanup,
  fireEvent,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { exampleShortBook } from "../reader/exampleDocuments.ts";
import { defaultReaderPreferences } from "../reader/readerPreferences.ts";
import {
  createFakeBackendClient,
  type FakeResponse,
  fakeFailure,
} from "../testSupport/createFakeBackendClient.ts";
import {
  fixtureProject,
  fixtureResponses,
} from "../testSupport/fixtureResponses.ts";
import {
  type RenderOptions,
  renderWithAppStore,
} from "../testSupport/renderWithAppStore.tsx";
import { ReaderScreen } from "./ReaderScreen.tsx";

afterEach(cleanup);

const bookFile: MediaFile = {
  id: "b1",
  project_id: "p1",
  name: "sample.epub",
  source: { kind: "path", path: "/books/sample.epub" },
  created_at_ms: 0,
  track_selection_json: null,
  origin: null,
};

const secondChapter = { chapterIndex: 1, paragraphIndex: 1, offset: 4 };

const storedInSecondChapter: RenderOptions = {
  storedPreferences: { "readingLocation:b1": JSON.stringify(secondChapter) },
};

function renderReader({
  mediaFile = bookFile,
  listed = [mediaFile],
  parsed = exampleShortBook,
  loadedPreferences = {},
  options = {},
}: {
  mediaFile?: MediaFile;
  /** The project's media files as the server lists them. */
  listed?: MediaFile[];
  parsed?: FakeResponse;
  /** The app's preferences as read when it started. */
  loadedPreferences?: Record<string, string>;
  options?: RenderOptions;
} = {}) {
  const client = createFakeBackendClient({
    ...fixtureResponses,
    "GET /projects/p1/media": { media_files: listed },
    "POST /documents/parse-local": parsed,
    "POST /documents/parse": parsed,
  });
  const rendered = renderWithAppStore(
    <ReaderScreen project={fixtureProject} mediaFileId={mediaFile.id} />,
    client,
    options,
  );
  act(() => {
    rendered.store.dispatch(actions.preferencesLoaded(loadedPreferences));
    rendered.store.dispatch(
      actions.openMediaFileRequested(fixtureProject.id, mediaFile.id),
    );
  });
  return { ...rendered, client };
}

const chapterHeading = () => screen.findByRole("heading", { level: 2 });

describe("ReaderScreen", () => {
  it("opens a book never read before at its start", async () => {
    renderReader();
    expect((await chapterHeading()).textContent).toBe("Chapter One");
  });

  it("returns to the place last read", async () => {
    renderReader({ options: storedInSecondChapter });
    expect((await chapterHeading()).textContent).toBe("Chapter Two");
  });

  it("shows the book's title", async () => {
    renderReader();
    expect(
      await screen.findByRole("heading", { level: 1, name: "Sample Book" }),
    ).toBeDefined();
  });

  it("shows the file's name for a book without a title", async () => {
    const untitled: Document = { ...exampleShortBook, title: "" };
    renderReader({ parsed: untitled });
    expect(
      await screen.findByRole("heading", { level: 1, name: "sample.epub" }),
    ).toBeDefined();
  });

  it("sets the text in the appearance last chosen", async () => {
    const sepia = { ...defaultReaderPreferences, theme: "sepia" };
    renderReader({
      loadedPreferences: { readerPreferences: JSON.stringify(sepia) },
    });
    await chapterHeading();
    expect(document.querySelector('[data-theme="sepia"]')).not.toBeNull();
  });

  it("keeps a change of appearance", async () => {
    const { effects } = renderReader();
    await chapterHeading();
    fireEvent.click(screen.getByRole("button", { name: "Appearance" }));
    fireEvent.click(screen.getByRole("radio", { name: "Sepia" }));
    expect(
      JSON.parse(effects.preferences.get("readerPreferences") ?? "{}").theme,
    ).toBe("sepia");
  });

  it("saves the place it was left at when the book closes", async () => {
    const { effects } = renderReader({ options: storedInSecondChapter });
    await chapterHeading();
    effects.preferences.clear();
    fireEvent.click(screen.getByRole("button", { name: "Back to Alpha" }));
    expect(effects.preferences.get("readingLocation:b1")).toBe(
      JSON.stringify(secondChapter),
    );
  });

  it("saves the place when the reader moves into another chapter", async () => {
    const { effects } = renderReader();
    await chapterHeading();
    fireEvent.click(screen.getByRole("button", { name: "Contents" }));
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: /Chapter Two/,
      }),
    );
    expect(
      JSON.parse(effects.preferences.get("readingLocation:b1") ?? "{}")
        .chapterIndex,
    ).toBe(1);
  });

  it("puts the cursor in the search field on Ctrl+F", async () => {
    renderReader();
    await chapterHeading();
    fireEvent.keyDown(document.body, { key: "f", ctrlKey: true });
    expect(document.activeElement).toBe(screen.getByRole("searchbox"));
  });

  it("explains a book that can no longer be found", async () => {
    renderReader({
      parsed: fakeFailure({ status: 404, message: "no file at that path" }),
    });
    expect((await screen.findByRole("alert")).textContent).toBe(
      "The book could not be opened. The file was not found. It may have been moved or deleted.",
    );
  });

  it("explains a file that has been removed from the project", async () => {
    renderReader({ listed: [] });
    expect((await screen.findByRole("alert")).textContent).toBe(
      "The book could not be opened. This file is no longer in the project.",
    );
  });

  it("goes back to the project from a book that could not be opened", async () => {
    const { store } = renderReader({
      parsed: fakeFailure({ status: 400, message: "invalid archive" }),
    });
    await screen.findByRole("alert");
    fireEvent.click(
      screen.getByRole("button", { name: "Back to the project" }),
    );
    await vi.waitFor(() =>
      expect(selectCurrentMediaFileId(store.getState())).toBeNull(),
    );
  });
});
