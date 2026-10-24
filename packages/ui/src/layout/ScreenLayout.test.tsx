import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { renderWithAppStore } from "../testSupport/renderWithAppStore.tsx";
import { ScreenLayout } from "./ScreenLayout.tsx";

afterEach(cleanup);

/** Returns the text at the left of the header, before the Profile button. */
function headerText() {
  return screen.getByRole("banner").textContent;
}

describe("ScreenLayout", () => {
  describe("without a way back", () => {
    it("shows the wordmark", () => {
      renderWithAppStore(<ScreenLayout>Content</ScreenLayout>);
      expect(headerText()).toBe("easyImmerse");
    });
  });

  describe("with a way back", () => {
    it("shows only the Back button, named for where it leads", () => {
      renderWithAppStore(
        <ScreenLayout onBack={() => undefined} backLabel="Projects">
          Content
        </ScreenLayout>,
      );
      expect(headerText()).toBe("Projects");
    });
  });

  it("shows the Profile button in the header", () => {
    renderWithAppStore(<ScreenLayout>Content</ScreenLayout>);
    expect(screen.getByRole("button", { name: "Profile" })).toBeTruthy();
  });
});
