import type { BackendClient } from "@easyimmerse/backend";
import { resetBackend } from "@easyimmerse/backend";
import { cleanup, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { renderWithAppStore } from "../testSupport/renderWithAppStore.tsx";
import { HomeScreen } from "./HomeScreen.tsx";

const offlineClient: BackendClient = {
  send: async () => ({ error: { status: "OFFLINE", message: "No server." } }),
};

afterEach(() => {
  cleanup();
  resetBackend();
});

describe("HomeScreen", () => {
  describe("when projects load", () => {
    it("lists each project name", async () => {
      renderWithAppStore(<HomeScreen onOpenProject={() => undefined} />);
      await screen.findByRole("button", { name: "Alpha" });
      const list = screen.getByRole("list", { name: "Projects" });
      expect(
        within(list)
          .getAllByRole("button")
          .map((button) => button.textContent),
      ).toEqual(["Alpha", "Beta"]);
    });

    it("calls onOpenProject with the id of a clicked project", async () => {
      const opened: string[] = [];
      renderWithAppStore(
        <HomeScreen onOpenProject={(id) => opened.push(id)} />,
      );
      fireEvent.click(await screen.findByRole("button", { name: "Beta" }));
      expect(opened).toEqual(["p2"]);
    });
  });

  describe("when no server is configured", () => {
    it("offers to continue offline", async () => {
      const opened: string[] = [];
      renderWithAppStore(
        <HomeScreen onOpenProject={(id) => opened.push(id)} />,
        offlineClient,
      );
      fireEvent.click(
        await screen.findByRole("button", { name: "Continue offline" }),
      );
      expect(opened).toEqual(["offline"]);
    });
  });

  it("requests an external link when Help is clicked", () => {
    const { effects } = renderWithAppStore(
      <HomeScreen onOpenProject={() => undefined} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Help" }));
    expect(effects.calls).toContainEqual({
      type: "openExternalUrl",
      url: "https://github.com/justinsilvestre/easyimmerse",
    });
  });
});
