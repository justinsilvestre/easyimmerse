import { selectPreference } from "@easyimmerse/state";
import { cleanup, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { renderWithAppStore } from "../testSupport/renderWithAppStore.tsx";
import { SubtitleAppearanceSection } from "./SubtitleAppearanceSection.tsx";
import { parseSubtitleAppearance } from "./subtitleAppearance.ts";

afterEach(cleanup);

function renderSection() {
  const { store } = renderWithAppStore(<SubtitleAppearanceSection />);
  const storedAppearance = () =>
    parseSubtitleAppearance(
      selectPreference("subtitleAppearance")(store.getState()),
    );
  return storedAppearance;
}

const section = () => screen.getByRole("region", { name: "Subtitles" });

describe("SubtitleAppearanceSection", () => {
  it("shows a preview of the subtitles", () => {
    renderSection();
    expect(within(section()).getByTestId("subtitle-preview").textContent).toBe(
      "Subtitles look like this.",
    );
  });

  it("keeps a changed appearance as a preference", () => {
    const storedAppearance = renderSection();
    fireEvent.click(screen.getByRole("radio", { name: "Heavy" }));
    expect(storedAppearance().textShadow).toBe("heavy");
  });

  it("shows the appearance it kept", () => {
    renderSection();
    fireEvent.click(screen.getByRole("radio", { name: "150%" }));
    expect(
      (screen.getByRole("radio", { name: "150%" }) as HTMLInputElement).checked,
    ).toBe(true);
  });

  it("restores the defaults", () => {
    const storedAppearance = renderSection();
    fireEvent.click(screen.getByRole("radio", { name: "Heavy" }));
    fireEvent.click(screen.getByRole("button", { name: "Restore defaults" }));
    expect(storedAppearance().textShadow).toBe("medium");
  });
});
