import { resetBackend } from "@easyimmerse/backend";
import { actions } from "@easyimmerse/state";
import type {
  ListMediaFilesResponse,
  ListSubtitleFilesResponse,
  LookupResponse,
} from "@easyimmerse/types";
import {
  act,
  cleanup,
  fireEvent,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createFakeBackendClient } from "../testSupport/createFakeBackendClient.ts";
import {
  fixtureFlashcard,
  fixtureMediaFiles,
  fixtureProject,
  fixtureResponses,
  fixtureTrack,
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

/** The fixture media files with German subtitles chosen for the episode. */
const withSubtitlesChosen: ListMediaFilesResponse = {
  media_files: fixtureMediaFiles.media_files.map((file) =>
    file.id === "m1"
      ? {
          ...file,
          subtitle_selection: { target: "file:s1", translation: null },
        }
      : file,
  ),
};

const subtitleFiles: ListSubtitleFilesResponse = {
  subtitle_files: [
    {
      id: "s1",
      media_file_id: "m1",
      name: "episode.de.srt",
      language: "de",
      cues: fixtureTrack.cues,
    },
  ],
};

const lookupResponse: LookupResponse = {
  dictionary_count: 1,
  entries: [
    {
      dictionary_id: "d1",
      dictionary_title: "German-English",
      entry: { term: "cat", reading: null, definitions: ["Katze"], tags: [] },
    },
  ],
};

function renderMediaScreen() {
  const client = createFakeBackendClient(
    {
      ...fixtureResponses,
      "GET /projects/p1/media": withSubtitlesChosen,
      "GET /projects/p1/media/m1/subtitle-files": subtitleFiles,
      "GET /projects/p1/media/m1/subtitle-tracks": { tracks: [] },
      "GET /lookup": lookupResponse,
      "POST /projects/p1/flashcards": fixtureFlashcard,
    },
    directPlaybackRoutes,
  );
  const rendered = renderWithAppStore(
    <MediaScreen
      project={fixtureProject}
      mediaFileId="m1"
      onBack={() => undefined}
    />,
    client,
    { server: fakeServer },
  );
  act(() => {
    rendered.store.dispatch(actions.preferencesLoaded({}));
    rendered.store.dispatch(actions.openMedia("m1"));
  });
  return { ...rendered, client };
}

const findSubtitles = () => screen.findByRole("list", { name: "Subtitles" });

/** Finds a cue's card by its start time, as its "Play from" button shows it. */
async function findCue(time: string) {
  const subtitles = await findSubtitles();
  const button = await within(subtitles).findByRole("button", {
    name: `Play from ${time}`,
  });
  return button.closest("li") as HTMLElement;
}

describe("MediaScreen", () => {
  it("lists the cues of the chosen subtitles", async () => {
    renderMediaScreen();
    const cue = await findCue("0:04");
    expect(cue.textContent).toContain("Good night.");
  });

  it("seeks to a cue's start when its time is clicked", async () => {
    const { effects } = renderMediaScreen();
    await findCue("0:04");
    fireEvent.click(screen.getByRole("button", { name: "Play from 0:04" }));
    expect(effects.calls).toContainEqual({ type: "seekPlayer", seconds: 4.25 });
  });

  it("looks up a word the pointer rests on", async () => {
    renderMediaScreen();
    const cue = await findCue("0:00");
    fireEvent.mouseEnter(within(cue).getByRole("button", { name: "cat" }));
    const popup = await screen.findByRole("region", { name: "Dictionary" });
    expect(await within(popup).findByText("Katze")).toBeDefined();
  });

  it("opens the flashcard editor with the cue's sentence when a word is clicked", async () => {
    renderMediaScreen();
    const cue = await findCue("0:00");
    fireEvent.click(within(cue).getByRole("button", { name: "cat" }));
    const sentence = await screen.findByLabelText("Sentence (de)");
    expect((sentence as HTMLTextAreaElement).value).toBe(
      "The cat is sleeping.",
    );
  });

  it("saves the flashcard to the project", async () => {
    const { client } = renderMediaScreen();
    const cue = await findCue("0:00");
    fireEvent.click(within(cue).getByRole("button", { name: "cat" }));
    fireEvent.click(await screen.findByRole("button", { name: "Save" }));
    await vi.waitFor(() =>
      expect(
        client.requests.some(
          (request) =>
            request.method === "POST" &&
            request.path === "/projects/p1/flashcards",
        ),
      ).toBe(true),
    );
  });

  it("adds a picked subtitles file to the media file", async () => {
    const { client, effects } = renderMediaScreen();
    await findCue("0:04");
    fireEvent.click(
      screen.getByRole("button", { name: "Add a subtitles file" }),
    );
    act(() =>
      effects.resolvePickFile({
        name: "episode.en.srt",
        source: { kind: "inline", text: "" },
      }),
    );
    await vi.waitFor(() =>
      expect(
        client.requests.some(
          (request) =>
            request.method === "POST" &&
            request.path === "/projects/p1/media/m1/subtitle-files",
        ),
      ).toBe(true),
    );
  });

  describe("when a changed flashcard is open", () => {
    async function openChangedFlashcard() {
      const rendered = renderMediaScreen();
      const cue = await findCue("0:00");
      fireEvent.click(within(cue).getByRole("button", { name: "cat" }));
      fireEvent.change(await screen.findByLabelText("Sentence (de)"), {
        target: { value: "Changed." },
      });
      // The editor takes the subtitles panel's place, so the next word is clicked in the subtitles over the video.
      act(() => rendered.store.dispatch(actions.playerTimeChanged(1)));
      fireEvent.click(screen.getByRole("button", { name: "sleeping" }));
      return rendered;
    }

    it("asks before another flashcard replaces it", async () => {
      await openChangedFlashcard();
      expect(
        await screen.findByText("Discard your changes to this flashcard?"),
      ).toBeDefined();
    });

    it("keeps the changes when the user keeps editing", async () => {
      await openChangedFlashcard();
      fireEvent.click(
        await screen.findByRole("button", { name: "Keep editing" }),
      );
      expect(
        (screen.getByLabelText("Sentence (de)") as HTMLTextAreaElement).value,
      ).toBe("Changed.");
    });
  });
});
