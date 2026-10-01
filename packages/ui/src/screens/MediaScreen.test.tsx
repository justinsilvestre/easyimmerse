import { resetBackend } from "@easyimmerse/backend";
import type { AppAction } from "@easyimmerse/state";
import { actions, selectScreen } from "@easyimmerse/state";
import type { MediaFile, SubtitleTrack } from "@easyimmerse/types";
import {
  act,
  cleanup,
  fireEvent,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createFakeBackendClient } from "../testSupport/createFakeBackendClient.ts";
import { fixtureProject } from "../testSupport/fixtureProject.ts";
import { fixtureResponses } from "../testSupport/fixtureResponses.ts";
import { renderWithAppStore } from "../testSupport/renderWithAppStore.tsx";
import { MediaScreen } from "./MediaScreen.tsx";

afterEach(() => {
  cleanup();
  resetBackend();
});

const [video, , book] = fixtureProject.media as [
  MediaFile,
  MediaFile,
  MediaFile,
];

const storedTrack: SubtitleTrack = {
  id: "track-3",
  name: "episode.srt",
  role: "target",
  language: null,
  source: { kind: "file", source: { kind: "browser_file", key: "k1" } },
};

function renderMediaScreen(
  media: MediaFile = video,
  storedFileTexts: Record<string, string> = {},
) {
  const client = createFakeBackendClient({
    ...fixtureResponses,
    "GET /projects/project-1": { ...fixtureProject, media: [media] },
    "POST /projects/project-1/flashcards": { id: "f1" },
    [`PUT /projects/project-1/media/${media.id}/duration`]: media,
  });
  const rendered = renderWithAppStore(
    <MediaScreen projectId="project-1" mediaId={media.id} />,
    client,
  );
  for (const [key, text] of Object.entries(storedFileTexts))
    rendered.effects.storedFileTexts.set(key, text);
  const dispatch = (action: AppAction) =>
    act(() => {
      rendered.store.dispatch(action);
    });
  dispatch(actions.mediaOpened("project-1", media));
  return { ...rendered, client, dispatch };
}

async function findCueItems() {
  const list = await screen.findByRole("list", { name: "Subtitles" });
  return within(list).getAllByRole("listitem");
}

async function hoverCat() {
  const rendered = renderMediaScreen();
  await findCueItems();
  rendered.dispatch(actions.playerTimeChanged(600));
  fireEvent.mouseEnter(screen.getByRole("button", { name: "cat" }));
  return rendered;
}

describe("MediaScreen", () => {
  it("names the media file", async () => {
    renderMediaScreen();
    expect(
      await screen.findByRole("heading", { name: video.name }),
    ).toBeTruthy();
  });

  it("lists the cues of the target track the server reads", async () => {
    renderMediaScreen();
    expect(await findCueItems()).toHaveLength(4);
  });

  it("parses a target track stored in the browser from its text", async () => {
    const media = { ...video, subtitle_tracks: [storedTrack] };
    const { client } = renderMediaScreen(media, { k1: "stored subtitles" });
    await findCueItems();
    expect(client.requests).toContainEqual(
      expect.objectContaining({
        path: "/timed-text/parse",
        body: {
          kind: "json",
          value: {
            source: { kind: "inline", text: "stored subtitles" },
            format: null,
          },
        },
      }),
    );
  });

  it("asks for a subtitles file in the role clicked", async () => {
    const { effects } = renderMediaScreen({ ...video, subtitle_tracks: [] });
    fireEvent.click(
      await screen.findByRole("button", { name: "Add translation subtitles" }),
    );
    expect(effects.calls).toContainEqual(
      expect.objectContaining({
        type: "pickFile",
        purpose: { kind: "subtitles", role: "translation" },
      }),
    );
  });

  it("returns to the project when Back is clicked", async () => {
    const { store } = renderMediaScreen();
    fireEvent.click(await screen.findByRole("button", { name: "Back" }));
    expect(selectScreen(store.getState())).toEqual({
      kind: "project",
      projectId: "project-1",
    });
  });

  it("opens the dictionary for typing when Look up is clicked", async () => {
    renderMediaScreen();
    fireEvent.click(await screen.findByRole("button", { name: "Look up" }));
    expect(screen.getByRole("searchbox", { name: "Word" })).toBeTruthy();
  });

  it("reports a media file that cannot be loaded", async () => {
    const { dispatch } = renderMediaScreen();
    await screen.findByRole("heading", { name: video.name });
    dispatch(actions.mediaUrlFailed(video.id, "The file moved."));
    expect(screen.getByRole("alert").textContent).toContain("The file moved.");
  });

  it("saves the duration once the player knows it", async () => {
    const media = { ...video, duration_ms: null };
    const { client, dispatch } = renderMediaScreen(media);
    await screen.findByRole("heading", { name: video.name });
    dispatch(actions.playerDurationKnown(5000.4));
    await vi.waitFor(() => {
      expect(client.requests).toContainEqual(
        expect.objectContaining({
          method: "PUT",
          body: { kind: "json", value: { duration_ms: 5000 } },
        }),
      );
    });
  });

  it("shows a document in the reader", async () => {
    renderMediaScreen(book);
    expect(
      await screen.findByRole("heading", { name: "Chapter One" }),
    ).toBeTruthy();
  });

  describe("when a word is hovered", () => {
    it("shows the dictionary entries for it", async () => {
      await hoverCat();
      expect(
        await screen.findByRole("heading", {
          name: "German–English Wiktionary",
        }),
      ).toBeTruthy();
    });

    it("drafts a flashcard when an entry is clicked", async () => {
      const { client } = await hoverCat();
      const entries = await screen.findAllByRole("button", {
        name: "Make flashcard from Katze",
      });
      fireEvent.click(entries[1] as HTMLElement);
      await screen.findByRole("dialog", { name: "New flashcard" });
      const draft = client.requests.find(
        (request) => request.path === "/flashcards/draft",
      );
      expect(draft?.body?.value).toMatchObject({
        word: "cat",
        l1_definitions: [],
        l2_definitions: [
          "kleines Raubtier mit weichem Fell, das als Haustier gehalten wird",
        ],
      });
    });
  });

  describe("when a word is clicked", () => {
    async function clickCat() {
      const rendered = await hoverCat();
      fireEvent.click(screen.getByRole("button", { name: "cat" }));
      await screen.findByRole("dialog", { name: "New flashcard" });
      return rendered;
    }

    it("opens the drafted flashcard in the editor", async () => {
      await clickCat();
      expect(screen.getByRole("textbox", { name: "Word" })).toHaveProperty(
        "value",
        "Katze",
      );
    });

    it("saves the flashcard and confirms", async () => {
      const { effects } = await clickCat();
      fireEvent.click(screen.getByRole("button", { name: "Save" }));
      await vi.waitFor(() => {
        expect(effects.calls).toContainEqual({
          type: "showNotification",
          message: "Flashcard saved",
        });
      });
    });

    it("closes the editor once the flashcard is saved", async () => {
      await clickCat();
      fireEvent.click(screen.getByRole("button", { name: "Save" }));
      await vi.waitFor(() => {
        expect(
          screen.queryByRole("dialog", { name: "New flashcard" }),
        ).toBeNull();
      });
    });
  });
});
