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
import { afterEach, describe, expect, it } from "vitest";
import { AppRoot } from "./AppRoot.tsx";
import { createFakeBackendClient } from "./testSupport/createFakeBackendClient.ts";
import { fixtureResponses } from "./testSupport/fixtureResponses.ts";

afterEach(() => {
  cleanup();
  resetBackend();
});

function renderAppRoot() {
  configureBackend(createFakeBackendClient(fixtureResponses));
  const store = createAppStore(createRecordingEffects(), backendStoreParts);
  render(<AppRoot store={store} playerRegistry={createPlayerRegistry()} />);
}

describe("AppRoot", () => {
  it("starts on the home screen", () => {
    renderAppRoot();
    expect(screen.getByRole("heading", { name: "Projects" })).toBeDefined();
  });

  it("shows the media screen after a project is opened", async () => {
    renderAppRoot();
    fireEvent.click(await screen.findByRole("button", { name: "Alpha" }));
    expect(screen.getByRole("region", { name: "Player" })).toBeDefined();
  });

  it("returns to the home screen when Back is clicked", async () => {
    renderAppRoot();
    fireEvent.click(await screen.findByRole("button", { name: "Alpha" }));
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("heading", { name: "Projects" })).toBeDefined();
  });
});
