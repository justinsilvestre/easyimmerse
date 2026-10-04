import type { BackendRequest } from "@easyimmerse/backend";
import { resetBackend } from "@easyimmerse/backend";
import { actions, selectCurrentMediaFileId } from "@easyimmerse/state";
import type { Flashcard } from "@easyimmerse/types";
import {
  act,
  cleanup,
  fireEvent,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { exampleFlashcard } from "../flashcards/exampleFlashcard.ts";
import { createFakeBackendClient } from "../testSupport/createFakeBackendClient.ts";
import {
  fixtureProject,
  fixtureResponses,
} from "../testSupport/fixtureResponses.ts";
import {
  directPlaybackRoutes,
  fakeServer,
} from "../testSupport/mediaFixtureResponses.ts";
import { renderWithAppStore } from "../testSupport/renderWithAppStore.tsx";
import { MediaScreen } from "./MediaScreen.tsx";

afterEach(() => {
  cleanup();
  resetBackend();
});

const savedFlashcard: Flashcard = {
  id: "f1",
  project_id: "p1",
  media_file_id: "m1",
  cue_index: null,
  content: exampleFlashcard,
  included_fields: ["word"],
  created_at_ms: 0,
  updated_at_ms: 0,
};

function renderMediaScreen() {
  const client = createFakeBackendClient(
    {
      ...fixtureResponses,
      "POST /projects/p1/media/m1/subtitles":
        fixtureResponses["GET /projects/p1/media/m1/subtitles"].tracks[0],
      "POST /projects/p1/flashcards": savedFlashcard,
    },
    directPlaybackRoutes,
  );
  const rendered = renderWithAppStore(
    <MediaScreen project={fixtureProject} mediaFileId="m1" />,
    client,
    { server: fakeServer },
  );
  act(() => {
    rendered.store.dispatch(actions.preferencesLoaded({}));
    rendered.store.dispatch(actions.openMedia("m1"));
  });
  return { ...rendered, client };
}

async function findSubtitles() {
  await screen.findByRole("button", { name: "night" });
  return screen.getByRole("list", { name: "Subtitles" });
}

function requestsTo(requests: BackendRequest[], method: string, path: string) {
  return requests.filter(
    (request) => request.method === method && request.path === path,
  );
}

function bodyOf(request: BackendRequest | undefined): unknown {
  return request?.body?.kind === "json" ? request.body.value : undefined;
}

describe("MediaScreen", () => {
  it("lists one card per cue of the target-language subtitles", async () => {
    renderMediaScreen();
    const list = await findSubtitles();
    expect(within(list).getAllByRole("listitem")).toHaveLength(4);
  });

  it("seeks the player to a cue's start when its time is clicked", async () => {
    const { effects } = renderMediaScreen();
    const list = await findSubtitles();
    fireEvent.click(
      within(list).getAllByRole("button", {
        name: "Play from 0:00",
      })[0] as HTMLElement,
    );
    expect(effects.calls).toContainEqual({ type: "seekPlayer", seconds: 0.5 });
  });

  it("requests a subtitles file when one is to be added", async () => {
    const { effects } = renderMediaScreen();
    await findSubtitles();
    fireEvent.click(
      screen.getByRole("button", { name: "Add a subtitles file" }),
    );
    expect(effects.calls).toContainEqual({
      type: "pickFile",
      accept: [".srt", ".vtt"],
    });
  });

  it("adds a picked subtitles file as the translation beside the shown subtitles", async () => {
    const { effects, client } = renderMediaScreen();
    await findSubtitles();
    fireEvent.click(
      screen.getByRole("button", { name: "Add a subtitles file" }),
    );
    act(() =>
      effects.resolvePickFile({
        name: "english.srt",
        source: {
          kind: "inline",
          text: "1\n00:00:01,000 --> 00:00:02,000\nHi",
        },
      }),
    );
    await vi.waitFor(() =>
      expect(
        bodyOf(
          requestsTo(
            client.requests,
            "POST",
            "/projects/p1/media/m1/subtitles",
          )[0],
        ),
      ).toMatchObject({ name: "english.srt", role: "translation" }),
    );
  });

  it("opens the flashcard editor with a word clicked in the subtitles", async () => {
    renderMediaScreen();
    const list = await findSubtitles();
    fireEvent.click(within(list).getByRole("button", { name: "cat" }));
    expect(
      (screen.getByLabelText("Word (de)") as HTMLTextAreaElement).value,
    ).toBe("cat");
  });

  it("takes a new flashcard's sentence from the cue whose word was clicked", async () => {
    renderMediaScreen();
    const list = await findSubtitles();
    fireEvent.click(within(list).getByRole("button", { name: "dog" }));
    expect(
      (screen.getByLabelText("Sentence (de)") as HTMLTextAreaElement).value,
    ).toBe("The dog wants to eat.\nIt is hungry.");
  });

  it("saves a new flashcard in the project", async () => {
    const { client } = renderMediaScreen();
    const list = await findSubtitles();
    fireEvent.click(within(list).getByRole("button", { name: "cat" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await vi.waitFor(() =>
      expect(
        bodyOf(
          requestsTo(client.requests, "POST", "/projects/p1/flashcards")[0],
        ),
      ).toMatchObject({ media_file_id: "m1", content: { word: "cat" } }),
    );
  });

  it("tells the user once the flashcard is saved", async () => {
    renderMediaScreen();
    const list = await findSubtitles();
    fireEvent.click(within(list).getByRole("button", { name: "cat" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(
      await screen.findByText("Flashcard saved to the project."),
    ).toBeDefined();
  });

  it("shows the waveform strip", () => {
    renderMediaScreen();
    expect(
      screen.getByRole("slider", { name: "Playback position" }),
    ).toBeDefined();
  });

  it("asks the player to play when Play is clicked", () => {
    const { effects } = renderMediaScreen();
    fireEvent.click(screen.getByRole("button", { name: "Play" }));
    expect(effects.calls).toContainEqual({ type: "togglePlayer" });
  });

  it("closes the media file when Project is clicked", () => {
    const { store } = renderMediaScreen();
    fireEvent.click(screen.getByRole("button", { name: "Project" }));
    expect(selectCurrentMediaFileId(store.getState())).toBeNull();
  });
});
