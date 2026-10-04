import type { BackendClient } from "@easyimmerse/backend";
import { resetBackend } from "@easyimmerse/backend";
import type { Project } from "@easyimmerse/types";
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createFakeBackendClient,
  fakeFailure,
} from "../testSupport/createFakeBackendClient.ts";
import {
  fixtureProject,
  fixtureProjects,
  fixtureResponses,
  fixtureSecondProject,
} from "../testSupport/fixtureResponses.ts";
import { renderWithAppStore } from "../testSupport/renderWithAppStore.tsx";
import { NewProjectScreen } from "./NewProjectScreen.tsx";

const createdProject: Project = { ...fixtureProject, id: "p3", name: "Gamma" };

/** The fixture server, where Beta (Japanese, with default tags) was created after Alpha. */
function createClientWhereBetaIsNewest() {
  const [alpha, beta] = fixtureProjects.projects;
  return createFakeBackendClient({
    ...fixtureResponses,
    "GET /projects": {
      projects: [alpha, { ...beta, created_at_ms: Date.now() }],
    },
    "GET /projects/p2": {
      ...fixtureSecondProject,
      settings: { ...fixtureSecondProject.settings, default_tags: ["anime"] },
    },
    "POST /projects": createdProject,
  });
}

afterEach(() => {
  cleanup();
  resetBackend();
  vi.restoreAllMocks();
});

function renderScreen(
  client: BackendClient = createClientWhereBetaIsNewest(),
  onCreated: (projectId: string) => void = () => undefined,
) {
  return renderWithAppStore(
    <NewProjectScreen onCreated={onCreated} onCancel={() => undefined} />,
    client,
  );
}

async function findSelectedValue(label: string): Promise<string> {
  return ((await screen.findByLabelText(label)) as HTMLSelectElement).value;
}

function submitWithName(name: string) {
  fireEvent.change(screen.getByLabelText("Project name"), {
    target: { value: name },
  });
  fireEvent.click(screen.getByRole("button", { name: "Create project" }));
}

describe("NewProjectScreen", () => {
  it("says that it is loading until the initial values are known", () => {
    renderScreen();
    expect(screen.getByText("Loading…")).toBeDefined();
  });

  describe("after a project was created", () => {
    it("starts from the last created project's target language", async () => {
      renderScreen();
      expect(await findSelectedValue("Target language")).toBe("ja");
    });

    it("starts from the last created project's default tags", async () => {
      renderScreen();
      expect(
        await screen.findByRole("button", { name: "Remove the tag anime" }),
      ).toBeDefined();
    });

    it("leaves the name empty", async () => {
      renderScreen();
      expect(
        ((await screen.findByLabelText("Project name")) as HTMLInputElement)
          .value,
      ).toBe("");
    });
  });

  describe("without any project", () => {
    const createEmptyClient = () =>
      createFakeBackendClient({ "GET /projects": { projects: [] } });

    it("targets German", async () => {
      renderScreen(createEmptyClient());
      expect(await findSelectedValue("Target language")).toBe("de");
    });

    it("translates into the browser's language", async () => {
      vi.spyOn(navigator, "language", "get").mockReturnValue("fr-FR");
      renderScreen(createEmptyClient());
      expect(await findSelectedValue("Translation language")).toBe("fr");
    });
  });

  describe("when submitted", () => {
    it("creates the project with the entered name and the settings", async () => {
      const client = createClientWhereBetaIsNewest();
      renderScreen(client);
      await screen.findByLabelText("Project name");
      submitWithName("Gamma");
      await vi.waitFor(() => {
        expect(client.requests).toContainEqual(
          expect.objectContaining({
            method: "POST",
            path: "/projects",
            body: {
              kind: "json",
              value: {
                name: "Gamma",
                settings: {
                  ...fixtureSecondProject.settings,
                  default_tags: ["anime"],
                },
              },
            },
          }),
        );
      });
    });

    it("calls onCreated with the new project's id", async () => {
      const onCreated = vi.fn();
      renderScreen(createClientWhereBetaIsNewest(), onCreated);
      await screen.findByLabelText("Project name");
      submitWithName("Gamma");
      await vi.waitFor(() => {
        expect(onCreated).toHaveBeenCalledWith("p3");
      });
    });

    it("shows a notification when the project cannot be created", async () => {
      const { effects } = renderScreen(
        createFakeBackendClient({
          ...fixtureResponses,
          "POST /projects": fakeFailure({ status: 400, message: "Blank." }),
        }),
      );
      await screen.findByLabelText("Project name");
      submitWithName("Gamma");
      await vi.waitFor(() => {
        expect(effects.calls).toContainEqual({
          type: "showNotification",
          message: "The project could not be created",
        });
      });
    });
  });
});
