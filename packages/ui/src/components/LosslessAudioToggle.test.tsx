import { resetBackend } from "@easyimmerse/backend";
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithAppStore } from "../testSupport/renderWithAppStore.tsx";
import { LosslessAudioToggle } from "./LosslessAudioToggle.tsx";

afterEach(() => {
  cleanup();
  resetBackend();
});

const findCheckbox = () =>
  screen.getByRole("checkbox", { name: "Keep audio lossless when converting" });

describe("LosslessAudioToggle", () => {
  it("requests the stored preferences on mount", () => {
    const { effects } = renderWithAppStore(<LosslessAudioToggle />);
    expect(effects.calls).toContainEqual({
      type: "loadPreference",
      key: "losslessAudio",
    });
  });

  it("explains the trade-off in the checkbox's description", () => {
    renderWithAppStore(<LosslessAudioToggle />);
    expect(
      screen.getByRole("checkbox", {
        description:
          "Converted audio keeps its full quality but takes more disk space.",
      }),
    ).toBeDefined();
  });

  it("is unchecked before a preference is stored", () => {
    renderWithAppStore(<LosslessAudioToggle />);
    expect(findCheckbox()).toHaveProperty("checked", false);
  });

  it("saves the preference as true when toggled on", () => {
    const { effects } = renderWithAppStore(<LosslessAudioToggle />);
    fireEvent.click(findCheckbox());
    expect(effects.preferences.get("losslessAudio")).toBe("true");
  });

  it("becomes checked once the loaded preference arrives", async () => {
    const { effects, store } = renderWithAppStore(<LosslessAudioToggle />);
    effects.preferences.set("losslessAudio", "true");
    store.dispatch({ type: "preferencesLoadRequested" });
    await vi.waitFor(() =>
      expect(findCheckbox()).toHaveProperty("checked", true),
    );
  });
});
