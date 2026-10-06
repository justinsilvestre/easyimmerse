import { resetBackend } from "@easyimmerse/backend";
import { cleanup, fireEvent, screen } from "@testing-library/react";
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

  it("offers no link to itself in the footer", () => {
    renderWithAppStore(
      <SettingsScreen
        onBack={() => undefined}
        onOpenDictionaries={() => undefined}
      />,
    );
    expect(screen.queryByRole("button", { name: "Settings" })).toBeNull();
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
        "Video conversion is unavailable, so no converted videos are stored.",
      ),
    ).toBeDefined();
  });
});
