import { resetBackend } from "@easyimmerse/backend";
import { cleanup, fireEvent, screen, within } from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fixtureProjects } from "../testSupport/fixtureResponses.ts";
import { renderWithAppStore } from "../testSupport/renderWithAppStore.tsx";
import { HomeScreenView } from "./HomeScreenView.tsx";

afterEach(() => {
  cleanup();
  resetBackend();
});

function renderHomeScreenView(
  props: Partial<ComponentProps<typeof HomeScreenView>> = {},
) {
  const callbacks = { onOpenProject: vi.fn(), onCreateProject: vi.fn() };
  renderWithAppStore(
    <HomeScreenView
      projects={fixtureProjects.projects}
      loading={false}
      error={null}
      {...callbacks}
      {...props}
    />,
  );
  return callbacks;
}

describe("HomeScreenView", () => {
  describe("with projects", () => {
    it("lists the projects in the given order", () => {
      renderHomeScreenView();
      const list = screen.getByRole("list", { name: "Projects" });
      expect(
        within(list)
          .getAllByRole("button")
          .map((button) => button.textContent),
      ).toEqual(["Alpha", "Beta"]);
    });

    it("shows when each project was last opened", () => {
      renderHomeScreenView();
      expect(screen.getAllByText(/^Opened /)).toHaveLength(2);
    });

    it("opens the clicked project", () => {
      const { onOpenProject } = renderHomeScreenView();
      fireEvent.click(screen.getByRole("button", { name: "Beta" }));
      expect(onOpenProject).toHaveBeenCalledWith("p2");
    });

    it("leaves out the empty state", () => {
      renderHomeScreenView();
      expect(screen.queryByText(/first project/)).toBeNull();
    });
  });

  describe("with no projects", () => {
    it("invites the user to create a first project", () => {
      renderHomeScreenView({ projects: [] });
      expect(screen.getByText(/first project/)).toBeTruthy();
    });
  });

  describe("while loading", () => {
    it("says that the projects are loading", () => {
      renderHomeScreenView({ projects: [], loading: true });
      expect(screen.getByRole("status").textContent).toMatch(/Loading/);
    });

    it("leaves out the empty state", () => {
      renderHomeScreenView({ projects: [], loading: true });
      expect(screen.queryByText(/first project/)).toBeNull();
    });
  });

  describe("when loading fails", () => {
    it("shows the error", () => {
      renderHomeScreenView({ projects: [], error: "Server unreachable." });
      expect(screen.getByRole("alert").textContent).toContain(
        "Server unreachable.",
      );
    });

    it("still offers to create a project", () => {
      const { onCreateProject } = renderHomeScreenView({
        projects: [],
        error: "Server unreachable.",
      });
      fireEvent.click(
        screen.getByRole("button", { name: "Create new project" }),
      );
      expect(onCreateProject).toHaveBeenCalled();
    });
  });

  it("creates a project when Create new project is clicked", () => {
    const { onCreateProject } = renderHomeScreenView();
    fireEvent.click(screen.getByRole("button", { name: "Create new project" }));
    expect(onCreateProject).toHaveBeenCalled();
  });

  it("renders the header actions", () => {
    renderHomeScreenView({ headerActions: <a href="#help">Help</a> });
    expect(screen.getByRole("link", { name: "Help" })).toBeTruthy();
  });

  it("names the product in the header", () => {
    renderHomeScreenView();
    expect(screen.getByRole("banner").textContent).toContain("easyImmerse");
  });
});
