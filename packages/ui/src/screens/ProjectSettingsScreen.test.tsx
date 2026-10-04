import type { BackendClient } from "@easyimmerse/backend";
import { resetBackend } from "@easyimmerse/backend";
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createFakeBackendClient,
  fakeFailure,
} from "../testSupport/createFakeBackendClient.ts";
import {
  fixtureProject,
  fixtureResponses,
} from "../testSupport/fixtureResponses.ts";
import { renderWithAppStore } from "../testSupport/renderWithAppStore.tsx";
import { ProjectSettingsScreen } from "./ProjectSettingsScreen.tsx";

afterEach(() => {
  cleanup();
  resetBackend();
});

const createSavingClient = () =>
  createFakeBackendClient({
    ...fixtureResponses,
    "PUT /projects/p1": { ...fixtureProject, name: "Alpha 2" },
  });

function renderScreen(
  client: BackendClient = createSavingClient(),
  onDone: () => void = () => undefined,
) {
  return renderWithAppStore(
    <ProjectSettingsScreen projectId="p1" onDone={onDone} />,
    client,
  );
}

async function renameAndSave(name: string) {
  fireEvent.change(await screen.findByLabelText("Project name"), {
    target: { value: name },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save settings" }));
}

describe("ProjectSettingsScreen", () => {
  it("starts from the project's name", async () => {
    renderScreen();
    expect(
      ((await screen.findByLabelText("Project name")) as HTMLInputElement)
        .value,
    ).toBe("Alpha");
  });

  it("reports when the project cannot be loaded", async () => {
    renderScreen(createFakeBackendClient({}));
    expect((await screen.findByRole("alert")).textContent).toBe(
      "Could not load the project.",
    );
  });

  it("saves the edited name with the project's settings", async () => {
    const client = createSavingClient();
    renderScreen(client);
    await renameAndSave("Alpha 2");
    await vi.waitFor(() => {
      expect(client.requests).toContainEqual(
        expect.objectContaining({
          method: "PUT",
          path: "/projects/p1",
          body: {
            kind: "json",
            value: { name: "Alpha 2", settings: fixtureProject.settings },
          },
        }),
      );
    });
  });

  it("calls onDone once saved", async () => {
    const onDone = vi.fn();
    renderScreen(createSavingClient(), onDone);
    await renameAndSave("Alpha 2");
    await vi.waitFor(() => {
      expect(onDone).toHaveBeenCalledOnce();
    });
  });

  it("calls onDone when cancelled", async () => {
    const onDone = vi.fn();
    renderScreen(createSavingClient(), onDone);
    fireEvent.click(await screen.findByRole("button", { name: "Cancel" }));
    expect(onDone).toHaveBeenCalledOnce();
  });

  it("shows a notification when the settings cannot be saved", async () => {
    const { effects } = renderScreen(
      createFakeBackendClient({
        ...fixtureResponses,
        "PUT /projects/p1": fakeFailure({ status: 400, message: "Blank." }),
      }),
    );
    await renameAndSave("Alpha 2");
    await vi.waitFor(() => {
      expect(effects.calls).toContainEqual({
        type: "showNotification",
        message: "The project settings could not be saved",
      });
    });
  });
});
