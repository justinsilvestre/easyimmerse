import { actions } from "@easyimmerse/state";
import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { renderWithAppStore } from "../testSupport/renderWithAppStore.tsx";
import { ServerSection } from "./ServerSection.tsx";

afterEach(cleanup);

const settings = {
  bind: "0.0.0.0:8787",
  auth: "launch_token",
  open_signup: false,
  api_only: false,
  autostart: false,
  ffmpeg_dir: null,
  expected_hosts: [],
} as const;

describe("ServerSection", () => {
  it("saves the address typed into the form", () => {
    const { store, effects } = renderWithAppStore(<ServerSection />);
    act(() => {
      store.dispatch(
        actions.desktopServerSettingsLoaded({
          ...settings,
          expected_hosts: [],
        }),
      );
    });
    fireEvent.change(screen.getByLabelText("Address and port"), {
      target: { value: "0.0.0.0:9000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(effects.calls).toContainEqual({
      type: "saveDesktopServerSettings",
      settings: { ...settings, expected_hosts: [], bind: "0.0.0.0:9000" },
    });
  });

  it("copies the log", () => {
    const { store, effects } = renderWithAppStore(<ServerSection />);
    act(() => {
      store.dispatch(
        actions.desktopServerLogsReceived([
          { time_ms: 0, level: "info", target: "app", message: "started" },
        ]),
      );
    });
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    expect(effects.calls).toContainEqual({
      type: "copyText",
      text: "1970-01-01T00:00:00.000Z INFO app: started",
    });
  });
});
