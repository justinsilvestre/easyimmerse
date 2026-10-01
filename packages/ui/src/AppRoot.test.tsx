import {
  backendStoreParts,
  configureBackend,
  resetBackend,
} from "@easyimmerse/backend";
import {
  createAppStore,
  createPlayerRegistry,
  createRecordingEffects,
} from "@easyimmerse/state";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppRoot } from "./AppRoot.tsx";
import { createFakeBackendClient } from "./testSupport/createFakeBackendClient.ts";
import { fixtureProject } from "./testSupport/fixtureProject.ts";
import { fixtureResponses } from "./testSupport/fixtureResponses.ts";

afterEach(() => {
  cleanup();
  resetBackend();
});

function renderAppRoot() {
  configureBackend(
    createFakeBackendClient({
      ...fixtureResponses,
      "GET /projects/p1": fixtureProject,
      "GET /projects/p1/flashcards": { flashcards: [] },
    }),
  );
  const effects = createRecordingEffects();
  const store = createAppStore(effects, backendStoreParts);
  render(<AppRoot store={store} playerRegistry={createPlayerRegistry()} />);
  return { effects, store };
}

async function openAlpha() {
  fireEvent.click(await screen.findByRole("button", { name: "Alpha" }));
  await screen.findByRole("heading", { name: "Dark, season one" });
}

describe("AppRoot", () => {
  it("starts on the home screen", () => {
    renderAppRoot();
    expect(screen.getByRole("heading", { name: "Projects" })).toBeDefined();
  });

  it("shows the new project form after Create new project is clicked", () => {
    renderAppRoot();
    fireEvent.click(screen.getByRole("button", { name: "Create new project" }));
    expect(screen.getByRole("heading", { name: "New project" })).toBeDefined();
  });

  it("shows the project screen after a project is opened", async () => {
    renderAppRoot();
    await openAlpha();
    expect(screen.getByRole("heading", { name: "Media" })).toBeDefined();
  });

  it("returns to the home screen from a project", async () => {
    renderAppRoot();
    await openAlpha();
    fireEvent.click(screen.getByRole("button", { name: /All projects/ }));
    expect(screen.getByRole("heading", { name: "Projects" })).toBeDefined();
  });

  it("acts on a picked file", async () => {
    const { effects } = renderAppRoot();
    await openAlpha();
    fireEvent.click(screen.getByRole("button", { name: "Add media" }));
    effects.resolvePickFile({
      name: "notes.pdf",
      source: { kind: "path", path: "/notes.pdf" },
    });
    await vi.waitFor(() => {
      expect(effects.calls).toContainEqual({
        type: "showNotification",
        message: "Unsupported file type",
      });
    });
  });
});
