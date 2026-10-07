import { resetBackend } from "@easyimmerse/backend";
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SettingsOpenContext } from "../navigationContext.ts";
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
    renderWithAppStore(
      <SettingsOpenContext value={true}>
        <SettingsScreen
          onBack={() => undefined}
          onOpenDictionaries={() => undefined}
        />
      </SettingsOpenContext>,
    );
    expect(
      screen
        .getByRole("button", { name: "Settings" })
        .getAttribute("aria-current"),
    ).toBe("page");
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
