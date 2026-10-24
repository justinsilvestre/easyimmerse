import { actions, createBrowserFileRegistry } from "@easyimmerse/state";
import {
  act,
  cleanup,
  fireEvent,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Screens } from "../../Screens.tsx";
import { createFakeBackendClient } from "../../testSupport/createFakeBackendClient.ts";
import {
  exampleLibraryItem,
  exampleLibraryMediaFile,
} from "../../testSupport/exampleLibrary.ts";
import { fixtureResponses } from "../../testSupport/fixtureResponses.ts";
import {
  directPlaybackRoutes,
  fakeServer,
} from "../../testSupport/mediaFixtureResponses.ts";
import { bodyOf, requestsTo } from "../../testSupport/renderMediaScreen.tsx";
import { renderWithAppStore } from "../../testSupport/renderWithAppStore.tsx";

afterEach(cleanup);

const draft = exampleLibraryItem({
  title: "park.mp4",
  status: { kind: "draft" },
  segment_count: 0,
});

const subtitles = "1\n00:00:01,000 --> 00:00:02,000\nHallo, Hund.";

/** Renders the library management screen for the server's owner, a library manager, over a server that makes the draft item i1. */
function renderManagement() {
  const registry = createBrowserFileRegistry<File>();
  const client = createFakeBackendClient(
    {
      ...fixtureResponses,
      "GET /auth/me": { kind: "launch" },
      "GET /library/items": { items: [] },
      "POST /library/items": draft,
      "PUT /library/items/i1/file": draft,
      "POST /library/items/i1/add": { project_id: "p1", media_file_id: "m3" },
      "GET /projects/p1/media": { media_files: [exampleLibraryMediaFile] },
      "GET /library/items/i1": draft,
      "GET /library/items/i1/text": { segments: [], chapter_titles: [] },
      "GET /projects/p1/media/m3/subtitles": {
        tracks: [],
        selection: { target_track_id: null, translation_track_id: null },
      },
      "POST /projects/p1/media/m3/subtitles": {
        id: "t1",
        media_file_id: "m3",
        name: "park.srt",
        format: "srt",
        sample: "Hallo, Hund.",
      },
    },
    directPlaybackRoutes,
  );
  const rendered = renderWithAppStore(<Screens />, client, {
    server: fakeServer,
    browserFileRegistry: registry,
  });
  act(() => {
    rendered.store.dispatch(actions.preferencesLoaded({}));
    rendered.store.dispatch(actions.navigated({ type: "manageLibrary" }));
  });
  return { ...rendered, client, registry };
}

/** Adds park.mp4 through "Add media" and waits until it opens in the player for preparing. */
async function addVideo(rendered: ReturnType<typeof renderManagement>) {
  const button = await screen.findByRole("button", { name: "Add media" });
  await waitFor(() => expect(button.getAttribute("aria-disabled")).toBeNull());
  fireEvent.click(button);
  const file = new File(["video"], "park.mp4", { type: "video/mp4" });
  const source = rendered.registry.register(file);
  act(() => rendered.effects.resolvePickMediaFile({ name: file.name, source }));
  await screen.findByRole("region", { name: "Preparing for learners" });
}

describe("LibraryManageScreen", () => {
  it("offers the media files a project takes when adding media", async () => {
    const { effects } = renderManagement();
    const button = await screen.findByRole("button", { name: "Add media" });
    await waitFor(() =>
      expect(button.getAttribute("aria-disabled")).toBeNull(),
    );
    fireEvent.click(button);
    expect(effects.calls).toContainEqual(
      expect.objectContaining({
        type: "pickMediaFile",
        accept: expect.arrayContaining([".mp4", ".mp3", ".epub", ".txt"]),
      }),
    );
  });

  describe("when a video is picked", () => {
    it("makes a draft named after the file", async () => {
      const rendered = renderManagement();
      await addVideo(rendered);
      expect(
        bodyOf(
          requestsTo(rendered.client.requests, "POST", "/library/items")[0],
        ),
      ).toMatchObject({ title: "park.mp4", kind: "video", language: "de" });
    });

    it("uploads the file to the draft", async () => {
      const rendered = renderManagement();
      await addVideo(rendered);
      expect(
        requestsTo(rendered.client.requests, "PUT", "/library/items/i1/file"),
      ).toHaveLength(1);
    });

    it("opens the draft in the player for preparing", async () => {
      const rendered = renderManagement();
      await addVideo(rendered);
      expect(screen.getByRole("region", { name: "Player" })).toBeDefined();
    });
  });

  describe("when a subtitles file is added in the player", () => {
    async function addSubtitles() {
      const rendered = renderManagement();
      await addVideo(rendered);
      const [add] = await screen.findAllByRole("button", {
        name: "Add a subtitles file",
      });
      fireEvent.click(add as HTMLElement);
      act(() =>
        rendered.effects.resolvePickFile({
          name: "park.srt",
          source: { kind: "inline", text: subtitles },
        }),
      );
      return rendered;
    }

    it("adds it to the draft's media file as its subtitles", async () => {
      const { client } = await addSubtitles();
      const path = "/projects/p1/media/m3/subtitles";
      await waitFor(() =>
        expect(
          bodyOf(requestsTo(client.requests, "POST", path)[0]),
        ).toMatchObject({ name: "park.srt", role: "target" }),
      );
    });

    it("fetches the item's text again, which the server made from the subtitles", async () => {
      const { client } = await addSubtitles();
      await waitFor(() =>
        expect(
          requestsTo(client.requests, "GET", "/library/items/i1/text"),
        ).toHaveLength(2),
      );
    });
  });
});
