import { resetBackend } from "@easyimmerse/backend";
import { actions } from "@easyimmerse/state";
import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { renderWithAppStore } from "../testSupport/renderWithAppStore.tsx";
import { PreferenceToggle } from "./PreferenceToggle.tsx";

afterEach(() => {
  cleanup();
  resetBackend();
});

const hint =
  "Converted audio keeps its full quality but takes more disk space.";

function renderToggle() {
  return renderWithAppStore(
    <PreferenceToggle
      preferenceKey="losslessAudio"
      label="Keep audio lossless when converting"
      hint={hint}
    />,
  );
}

const findCheckbox = () =>
  screen.getByRole("checkbox", { name: "Keep audio lossless when converting" });

describe("PreferenceToggle", () => {
  it("is unchecked before a preference is stored", () => {
    renderToggle();
    expect(findCheckbox()).toHaveProperty("checked", false);
  });

  it("saves the preference as true when toggled on", () => {
    const { effects } = renderToggle();
    fireEvent.click(findCheckbox());
    expect(effects.preferences.get("losslessAudio")).toBe("true");
  });

  it("becomes checked once the loaded preference arrives", () => {
    const { store } = renderToggle();
    act(() => {
      store.dispatch(actions.preferencesLoaded({ losslessAudio: "true" }));
    });
    expect(findCheckbox()).toHaveProperty("checked", true);
  });

  it("describes the checkbox with the hint", () => {
    renderToggle();
    expect(screen.getByRole("checkbox", { description: hint })).toBeDefined();
  });

  it("shows no hint when none is given", () => {
    renderWithAppStore(
      <PreferenceToggle
        preferenceKey="showTranslations"
        label="Show translations"
      />,
    );
    expect(
      screen.getByRole("checkbox").getAttribute("aria-describedby"),
    ).toBeNull();
  });
});
