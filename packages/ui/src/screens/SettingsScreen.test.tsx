import { resetBackend } from "@easyimmerse/backend";
import { actions } from "@easyimmerse/state";
import {
  act,
  cleanup,
  fireEvent,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { renderWithAppStore } from "../testSupport/renderWithAppStore.tsx";
import { SettingsScreen } from "./SettingsScreen.tsx";

afterEach(() => {
  cleanup();
  resetBackend();
});

describe("SettingsScreen", () => {
  it("calls onBack when Back is clicked", () => {
    let backCount = 0;
    renderWithAppStore(
      <SettingsScreen
        onBack={() => {
          backCount += 1;
        }}
        onOpenDictionaries={() => undefined}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(backCount).toBe(1);
  });

  it("opens the dictionaries settings from their link", () => {
    let openCount = 0;
    renderWithAppStore(
      <SettingsScreen
        onBack={() => undefined}
        onOpenDictionaries={() => {
          openCount += 1;
        }}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Dictionaries/ }));
    expect(openCount).toBe(1);
  });

  it("marks the footer's Settings control as the page already open", () => {
    const { store } = renderWithAppStore(
      <SettingsScreen
        onBack={() => undefined}
        onOpenDictionaries={() => undefined}
      />,
    );
    act(() => {
      store.dispatch(actions.navigated({ type: "openSettings" }));
    });
    expect(
      screen
        .getByRole("button", { name: "Settings" })
        .getAttribute("aria-current"),
    ).toBe("page");
  });

  it("shows the subtitle appearance controls in a Subtitles section", () => {
    renderWithAppStore(
      <SettingsScreen
        onBack={() => undefined}
        onOpenDictionaries={() => undefined}
      />,
    );
    expect(
      within(screen.getByRole("region", { name: "Subtitles" })).getByRole(
        "slider",
        { name: "Background opacity" },
      ),
    ).toBeDefined();
  });

  it("treats conversion as unavailable until told otherwise", () => {
    renderWithAppStore(
      <SettingsScreen
        onBack={() => undefined}
        onOpenDictionaries={() => undefined}
      />,
    );
    expect(
      screen.getByText(
        "Media conversion is unavailable, so there is no cache.",
      ),
    ).toBeDefined();
  });
});
