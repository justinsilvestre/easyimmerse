import { resetBackend } from "@easyimmerse/backend";
import { actions } from "@easyimmerse/state";
import { act, cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createFakeBackendClient } from "../testSupport/createFakeBackendClient.ts";
import { fixtureResponses } from "../testSupport/fixtureResponses.ts";
import { directPlaybackRoutes } from "../testSupport/mediaFixtureResponses.ts";
import { renderWithAppStore } from "../testSupport/renderWithAppStore.tsx";
import { PlayerWaveform } from "./PlayerWaveform.tsx";

afterEach(() => {
  cleanup();
  resetBackend();
});

function renderWaveform(mediaFileId: string) {
  const client = createFakeBackendClient(
    fixtureResponses,
    directPlaybackRoutes,
  );
  const rendered = renderWithAppStore(
    <PlayerWaveform projectId="p1" mediaFileId={mediaFileId} />,
    client,
  );
  act(() =>
    rendered.store.dispatch(actions.openMediaFileRequested("p1", mediaFileId)),
  );
  return { ...rendered, client };
}

const waveformRequests = (
  client: ReturnType<typeof renderWaveform>["client"],
) => client.requests.filter((request) => request.path.endsWith("/waveform"));

const findSlider = () =>
  screen.getByRole("slider", { name: "Playback position" });

describe("PlayerWaveform", () => {
  it("requests peaks windows for a file on the server's disk", async () => {
    const { client } = renderWaveform("m1");
    await vi.waitFor(() =>
      expect(waveformRequests(client).length).toBeGreaterThan(0),
    );
  });

  it("asks for the first window up to the probed duration", async () => {
    const { client } = renderWaveform("m1");
    await vi.waitFor(() =>
      expect(waveformRequests(client)[0]?.query).toEqual({
        start_ms: "0",
        end_ms: "10000",
      }),
    );
  });

  it("spans the probed duration until the player reports one", async () => {
    renderWaveform("m1");
    await vi.waitFor(() =>
      expect(findSlider().getAttribute("aria-valuemax")).toBe("10"),
    );
  });

  it("spans the player's duration once it is known", async () => {
    const { store } = renderWaveform("m1");
    act(() => store.dispatch(actions.playerDurationChanged(42)));
    expect(findSlider().getAttribute("aria-valuemax")).toBe("42");
  });

  it("requests no peaks for a file the browser holds", async () => {
    const { client } = renderWaveform("m2");
    await screen.findByRole("slider", { name: "Playback position" });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
    expect(waveformRequests(client)).toHaveLength(0);
  });
});
