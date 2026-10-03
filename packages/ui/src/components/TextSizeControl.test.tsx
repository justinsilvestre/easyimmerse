import { selectTextSize } from "@easyimmerse/state";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AppFeaturesContext } from "../appFeaturesContext.ts";
import { AppStoreProviders } from "../testSupport/AppStoreProviders.tsx";
import { createTestAppStore } from "../testSupport/createTestAppStore.ts";
import { renderWithAppStore } from "../testSupport/renderWithAppStore.tsx";
import { TextSizeControl } from "./TextSizeControl.tsx";

afterEach(cleanup);

describe("TextSizeControl", () => {
  it("starts at the medium size", () => {
    renderWithAppStore(<TextSizeControl />);
    expect(screen.getByLabelText("Medium")).toHaveProperty("checked", true);
  });

  it("stores the chosen size", () => {
    const { store } = renderWithAppStore(<TextSizeControl />);
    fireEvent.click(screen.getByLabelText("Large"));
    expect(selectTextSize(store.getState())).toBe("large");
  });

  it("saves the chosen size as a preference", () => {
    const { effects } = renderWithAppStore(<TextSizeControl />);
    fireEvent.click(screen.getByLabelText("Large"));
    expect(effects.preferences.get("textSize")).toBe("large");
  });

  it("renders nothing where the platform has no text size control", () => {
    const { store, playerRegistry } = createTestAppStore();
    render(
      <AppStoreProviders store={store} playerRegistry={playerRegistry}>
        <AppFeaturesContext value={{ hasTextSizeControl: false }}>
          <TextSizeControl />
        </AppFeaturesContext>
      </AppStoreProviders>,
    );
    expect(screen.queryByLabelText("Text size")).toBeNull();
  });
});
