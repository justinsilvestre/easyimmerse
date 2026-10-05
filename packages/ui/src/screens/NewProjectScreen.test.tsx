import type { BackendRequest } from "@easyimmerse/backend";
import { resetBackend } from "@easyimmerse/backend";
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createFakeBackendClient } from "../testSupport/createFakeBackendClient.ts";
import {
  fixtureProject,
  fixtureResponses,
} from "../testSupport/fixtureResponses.ts";
import { renderWithAppStore } from "../testSupport/renderWithAppStore.tsx";
import { NewProjectScreen } from "./NewProjectScreen.tsx";

afterEach(() => {
  cleanup();
  resetBackend();
});

function renderForm(onCreated: (projectId: string) => void = () => undefined) {
  const client = createFakeBackendClient({
    ...fixtureResponses,
    "POST /projects": { ...fixtureProject, id: "p3" },
  });
  renderWithAppStore(
    <NewProjectScreen onCreated={onCreated} onCancel={() => undefined} />,
    client,
  );
  return client;
}

const findTargetLanguage = async () =>
  (await screen.findByLabelText(/Target language/)) as HTMLSelectElement;

function bodyOf(request: BackendRequest | undefined): unknown {
  return request?.body?.kind === "json" ? request.body.value : undefined;
}

describe("NewProjectScreen", () => {
  it("starts from the language of the last created project", async () => {
    renderForm();
    expect((await findTargetLanguage()).value).toBe("ja");
  });

  it("sends the settings to the server", async () => {
    const client = renderForm();
    fireEvent.change(await screen.findByLabelText(/Project name/), {
      target: { value: "Korean" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create project" }));
    await vi.waitFor(() =>
      expect(
        bodyOf(client.requests.find((request) => request.method === "POST")),
      ).toMatchObject({ name: "Korean", target_language: "ja" }),
    );
  });

  it("opens the created project", async () => {
    const created: string[] = [];
    renderForm((projectId) => created.push(projectId));
    fireEvent.change(await screen.findByLabelText(/Project name/), {
      target: { value: "Korean" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create project" }));
    await vi.waitFor(() => expect(created).toEqual(["p3"]));
  });
});
