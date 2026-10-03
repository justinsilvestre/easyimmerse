import { selectTextScale } from "@easyimmerse/state";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AppFeaturesContext } from "../appFeaturesContext.ts";
import { AppStoreProviders } from "../testSupport/AppStoreProviders.tsx";
import { createTestAppStore } from "../testSupport/createTestAppStore.ts";
import { renderWithAppStore } from "../testSupport/renderWithAppStore.tsx";
import { TextSizeMenu } from "./TextSizeMenu.tsx";

afterEach(cleanup);

function openMenu() {
  fireEvent.click(screen.getByRole("button", { name: "Text size" }));
}

describe("TextSizeMenu", () => {
  it("keeps its panel closed at first", () => {
    renderWithAppStore(<TextSizeMenu />);
    expect(screen.queryByRole("group", { name: "Text size" })).toBeNull();
  });

  it("shows the current scale once opened", () => {
    renderWithAppStore(<TextSizeMenu />);
    openMenu();
    expect(screen.getByRole("status").textContent).toBe("100%");
  });

  it("steps the scale up", () => {
    const { store } = renderWithAppStore(<TextSizeMenu />);
    openMenu();
    fireEvent.click(screen.getByRole("button", { name: "Larger text" }));
    expect(selectTextScale(store.getState())).toBe(112.5);
  });

  it("goes back to the default", () => {
    const { store } = renderWithAppStore(<TextSizeMenu />);
    openMenu();
    fireEvent.click(screen.getByRole("button", { name: "Smaller text" }));
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(selectTextScale(store.getState())).toBe(100);
  });

  it("saves the chosen scale as a preference", () => {
    const { effects } = renderWithAppStore(<TextSizeMenu />);
    openMenu();
    fireEvent.click(screen.getByRole("button", { name: "Larger text" }));
    expect(effects.preferences.get("textScale")).toBe("112.5");
  });

  it("renders nothing where the platform has no text size control", () => {
    const { store, playerRegistry } = createTestAppStore();
    render(
      <AppStoreProviders store={store} playerRegistry={playerRegistry}>
        <AppFeaturesContext value={{ hasTextSizeControl: false }}>
          <TextSizeMenu />
        </AppFeaturesContext>
      </AppStoreProviders>,
    );
    expect(screen.queryByRole("button", { name: "Text size" })).toBeNull();
  });
});
