import type { BackendRequest } from "@easyimmerse/backend";
import { actions, selectRoute } from "@easyimmerse/state";
import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createFakeBackendClient } from "../testSupport/createFakeBackendClient.ts";
import {
  fixtureProject,
  fixtureResponses,
} from "../testSupport/fixtureResponses.ts";
import { renderWithAppStore } from "../testSupport/renderWithAppStore.tsx";
import { NewProjectScreen } from "./NewProjectScreen.tsx";

afterEach(cleanup);

function renderForm() {
  const client = createFakeBackendClient({
    ...fixtureResponses,
    "POST /projects": { ...fixtureProject, id: "p3" },
  });
  const { store } = renderWithAppStore(
    <NewProjectScreen onCancel={() => undefined} />,
    client,
  );
  act(() => store.dispatch(actions.navigated({ type: "createProject" })));
  return { client, store };
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
    const { client } = renderForm();
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
    const { store } = renderForm();
    fireEvent.change(await screen.findByLabelText(/Project name/), {
      target: { value: "Korean" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create project" }));
    await vi.waitFor(() =>
      expect(selectRoute(store.getState())).toEqual({
        screen: "project",
        projectId: "p3",
      }),
    );
  });
});
