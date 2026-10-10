import { actions } from "@easyimmerse/state";
import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { createFakeBackendClient } from "../testSupport/createFakeBackendClient.ts";
import { renderWithAppStore } from "../testSupport/renderWithAppStore.tsx";
import { usePlaybackPause } from "./usePlaybackPause.ts";

afterEach(cleanup);

function PauseProbe() {
  const pause = usePlaybackPause();
  return (
    <>
      <button type="button" onClick={pause.pause}>
        Pause
      </button>
      <button type="button" onClick={pause.resume}>
        Resume
      </button>
      <button type="button" onClick={pause.forget}>
        Forget
      </button>
    </>
  );
}

/** Renders the probe over a player that reports whether it plays. */
function renderProbe(isPlaying: boolean) {
  const rendered = renderWithAppStore(
    <PauseProbe />,
    createFakeBackendClient({}),
  );
  act(() =>
    rendered.store.dispatch(actions.openMediaFileRequested("p1", "m1")),
  );
  const report = (playing: boolean) =>
    act(() => rendered.store.dispatch(actions.playerPlayingChanged(playing)));
  report(isPlaying);
  const press = (name: string) =>
    fireEvent.click(screen.getByRole("button", { name }));
  const playerCalls = () =>
    rendered.effects.calls
      .map((call) => call.type)
      .filter((type) => type.endsWith("Player"));
  return { report, press, playerCalls };
}

describe("usePlaybackPause", () => {
  it("pauses a playing player", () => {
    const { press, playerCalls } = renderProbe(true);
    press("Pause");
    expect(playerCalls()).toEqual(["pausePlayer"]);
  });

  it("leaves a paused player alone", () => {
    const { press, playerCalls } = renderProbe(false);
    press("Pause");
    press("Resume");
    expect(playerCalls()).toEqual([]);
  });

  it("resumes the player it paused with a play request", () => {
    const { press, report, playerCalls } = renderProbe(true);
    press("Pause");
    report(false);
    press("Resume");
    expect(playerCalls()).toEqual(["pausePlayer", "playPlayer"]);
  });

  it("leaves playback alone once the user has resumed it by hand", () => {
    const { press, report, playerCalls } = renderProbe(true);
    press("Pause");
    report(false);
    report(true);
    report(false);
    press("Resume");
    expect(playerCalls()).toEqual(["pausePlayer"]);
  });

  it("keeps the player paused once the pause is forgotten", () => {
    const { press, report, playerCalls } = renderProbe(true);
    press("Pause");
    report(false);
    press("Forget");
    press("Resume");
    expect(playerCalls()).toEqual(["pausePlayer"]);
  });
});
