import type { BackendRequest } from "@easyimmerse/backend";
import { resetBackend } from "@easyimmerse/backend";
import { selectScreen } from "@easyimmerse/state";
import type { Project, ProjectSettings } from "@easyimmerse/types";
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { InterfaceLanguageContext } from "../hooks/useInterfaceLanguage.ts";
import { createFakeBackendClient } from "../testSupport/createFakeBackendClient.ts";
import { fixtureProject } from "../testSupport/fixtureProject.ts";
import { fixtureResponses } from "../testSupport/fixtureResponses.ts";
import { renderWithAppStore } from "../testSupport/renderWithAppStore.tsx";
import { NewProjectScreen } from "./NewProjectScreen.tsx";

afterEach(() => {
  cleanup();
  resetBackend();
});

const betaProject: Project = {
  ...fixtureProject,
  id: "p2",
  settings: {
    ...fixtureProject.settings,
    name: "Beta",
    target_language: "ja",
  },
};

function createdProject(request: BackendRequest): Project {
  const settings = request.body?.value as ProjectSettings;
  return { ...fixtureProject, id: "p3", settings, media: [] };
}

function renderNewProjectScreen(projects = fixtureResponses["GET /projects"]) {
  const client = createFakeBackendClient({
    ...fixtureResponses,
    "GET /projects": projects,
    "GET /projects/p2": betaProject,
    "POST /projects": createdProject,
  });
  const rendered = renderWithAppStore(
    <InterfaceLanguageContext value="fr">
      <NewProjectScreen />
    </InterfaceLanguageContext>,
    client,
  );
  return { ...rendered, client };
}

const selectedValue = (label: string) =>
  (screen.getByLabelText(label) as HTMLSelectElement).value;

describe("NewProjectScreen", () => {
  describe("when a project exists", () => {
    it("starts from the most recently created project's languages", async () => {
      renderNewProjectScreen();
      await screen.findByRole("button", { name: "Create project" });
      expect(selectedValue("Target language")).toBe("ja");
    });

    it("leaves the name blank", async () => {
      renderNewProjectScreen();
      await screen.findByRole("button", { name: "Create project" });
      expect(screen.getByRole("textbox", { name: "Name" })).toHaveProperty(
        "value",
        "",
      );
    });
  });

  it("translates into the interface language when no project exists", async () => {
    renderNewProjectScreen({ projects: [] });
    await screen.findByRole("button", { name: "Create project" });
    expect(selectedValue("Translation language")).toBe("fr");
  });

  describe("when the form is submitted", () => {
    async function submit() {
      const rendered = renderNewProjectScreen();
      fireEvent.change(await screen.findByRole("textbox", { name: "Name" }), {
        target: { value: "Gamma" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Create project" }));
      return rendered;
    }

    it("creates the project with the entered settings", async () => {
      const { client } = await submit();
      await vi.waitFor(() => {
        const created = client.requests.find(
          (request) => request.method === "POST",
        );
        expect(created?.body?.value).toMatchObject({ name: "Gamma" });
      });
    });

    it("opens the new project", async () => {
      const { store } = await submit();
      await vi.waitFor(() => {
        expect(selectScreen(store.getState())).toEqual({
          kind: "project",
          projectId: "p3",
        });
      });
    });
  });

  it("returns home when cancelled", async () => {
    const { store } = renderNewProjectScreen();
    fireEvent.click(await screen.findByRole("button", { name: "Cancel" }));
    expect(selectScreen(store.getState())).toEqual({ kind: "home" });
  });
});
