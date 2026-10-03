import { resetBackend } from "@easyimmerse/backend";
import {
  act,
  cleanup,
  fireEvent,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { createFakeBackendClient } from "../testSupport/createFakeBackendClient.ts";
import { fixtureResponses } from "../testSupport/fixtureResponses.ts";
import { renderWithAppStore } from "../testSupport/renderWithAppStore.tsx";
import { MediaScreen } from "./MediaScreen.tsx";

afterEach(() => {
  cleanup();
  resetBackend();
});

function renderMediaScreen() {
  return renderWithAppStore(
    <MediaScreen projectId="p1" onBack={() => undefined} />,
  );
}

async function findSubtitles() {
  await screen.findByText("Good night.");
  return screen.getByRole("list", { name: "Subtitles" });
}

describe("MediaScreen", () => {
  it("renders one item per cue of the fixture subtitles", async () => {
    renderMediaScreen();
    const list = await findSubtitles();
    expect(within(list).getAllByRole("listitem")).toHaveLength(4);
  });

  it("parses the fixture subtitle text through the backend", async () => {
    const client = createFakeBackendClient(fixtureResponses);
    renderWithAppStore(
      <MediaScreen projectId="p1" onBack={() => undefined} />,
      client,
    );
    await findSubtitles();
    expect(client.requests.map((request) => request.path)).toContain(
      "/timed-text/parse",
    );
  });

  it("seeks the player to the cue's start when a cue is clicked", async () => {
    const { effects } = renderMediaScreen();
    const list = await findSubtitles();
    fireEvent.click(
      within(list).getByRole("button", { name: "The cat is sleeping." }),
    );
    expect(effects.calls).toContainEqual({ type: "seekPlayer", seconds: 0.5 });
  });

  it("copies the cue text when its Copy button is clicked", async () => {
    const { effects } = renderMediaScreen();
    const list = await findSubtitles();
    fireEvent.click(within(list).getByRole("button", { name: "Copy cue 4" }));
    expect(effects.calls).toContainEqual({
      type: "copyToClipboard",
      text: "Good night.",
    });
  });

  it("shows the time the player was seeked to", async () => {
    const { playerRegistry } = renderMediaScreen();
    await findSubtitles();
    act(() => playerRegistry.current()?.seek(61.75));
    expect(screen.getByRole("region", { name: "Player" }).textContent).toBe(
      "1:01.8",
    );
  });

  it("requests a file pick when the pick button is clicked", async () => {
    const { effects } = renderMediaScreen();
    fireEvent.click(
      screen.getByRole("button", { name: "Pick a subtitle file" }),
    );
    expect(effects.calls).toContainEqual({
      type: "pickFile",
      accept: [".srt", ".vtt"],
    });
  });
});
