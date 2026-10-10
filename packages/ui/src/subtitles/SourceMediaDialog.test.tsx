import type { FormInput } from "@easyimmerse/types";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { exampleSourceMediaForm } from "../plugins/examplePluginForms.ts";
import { TestStoreProvider } from "../testSupport/TestStoreProvider.tsx";
import { SourceMediaDialog } from "./SourceMediaDialog.tsx";

afterEach(cleanup);

function renderDialog(
  props: Partial<Parameters<typeof SourceMediaDialog>[0]> = {},
) {
  const actions: [string, FormInput[]][] = [];
  render(
    <SourceMediaDialog
      title="Video site"
      form={exampleSourceMediaForm}
      isBusy={false}
      error={null}
      onAction={(actionId, input) => actions.push([actionId, input])}
      onClose={() => undefined}
      {...props}
    />,
    { wrapper: TestStoreProvider },
  );
  return { actions };
}

describe("SourceMediaDialog", () => {
  it("says that the plugin is being asked for its form", () => {
    renderDialog({ form: null });
    expect(screen.getByRole("status").textContent).toBe(
      "Asking the plugin what it offers…",
    );
  });

  it("is named after the plugin until the form arrives", () => {
    renderDialog({ form: null });
    expect(screen.getByRole("heading", { name: "Video site" })).toBeTruthy();
  });

  it("sends the pressed action with the form's input", () => {
    const { actions } = renderDialog();
    fireEvent.click(screen.getByLabelText("English (automatic)"));
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(actions).toEqual([
      [
        "apply",
        [
          { field: "fetch", values: ["en"] },
          { field: "remove", values: [] },
        ],
      ],
    ]);
  });

  it("says that the plugin is working on the action", () => {
    renderDialog({ isBusy: true });
    expect(screen.getByRole("status").textContent).toContain("Working");
  });

  it("shows why the form could not be shown or the action carried out", () => {
    renderDialog({ error: "The video is private." });
    expect(screen.getByRole("alert").textContent).toBe("The video is private.");
  });
});
