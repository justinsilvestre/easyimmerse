import { selectRoute } from "@easyimmerse/state";
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { renderWithAppStore } from "../testSupport/renderWithAppStore.tsx";
import { PlayerFailure } from "./PlayerFailure.tsx";

afterEach(cleanup);

const desktop = {
  serverUrl: "http://127.0.0.1:5000",
  token: "t",
  bundledIn: "desktop",
} as const;

describe("PlayerFailure", () => {
  it("opens the media conversion settings when no video encoder works on the desktop app", () => {
    const { store } = renderWithAppStore(
      <PlayerFailure cause="No encoder." needsVideoEncoder />,
      undefined,
      { server: desktop },
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Open media conversion settings" }),
    );
    expect(selectRoute(store.getState())).toMatchObject({
      screen: "settings",
      scrollTarget: "mediaConversion",
    });
  });

  it("offers no settings outside the desktop app", () => {
    renderWithAppStore(<PlayerFailure cause="No encoder." needsVideoEncoder />);
    expect(
      screen.queryByRole("button", { name: "Open media conversion settings" }),
    ).toBeNull();
  });
});
