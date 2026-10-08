import type { FormInput } from "@easyimmerse/types";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { exampleLookedUpForm } from "../plugins/examplePluginForms.ts";
import {
  exampleFailedJob,
  exampleRunningJob,
} from "./exampleMediaSourceJob.ts";
import { ImportMediaDialog } from "./ImportMediaDialog.tsx";

afterEach(cleanup);

function renderDialog(
  props: Partial<Parameters<typeof ImportMediaDialog>[0]> = {},
) {
  const actions: [string, FormInput[]][] = [];
  render(
    <ImportMediaDialog
      label="Add from a video site"
      form={exampleLookedUpForm}
      isBusy={false}
      job={null}
      error={null}
      onAction={(actionId, input) => actions.push([actionId, input])}
      onClose={() => undefined}
      {...props}
    />,
  );
  return { actions };
}

const pressAdd = () =>
  fireEvent.click(screen.getByRole("button", { name: "Add" }));

describe("ImportMediaDialog", () => {
  it("says that the plugin is being asked for its form", () => {
    renderDialog({ form: null });
    expect(screen.getByRole("status").textContent).toBe(
      "Asking the plugin what it needs…",
    );
  });

  it("is named after the import button until the form arrives", () => {
    renderDialog({ form: null });
    expect(
      screen.getByRole("heading", { name: "Add from a video site" }),
    ).toBeTruthy();
  });

  it("sends the pressed action with the form's input", () => {
    const { actions } = renderDialog();
    pressAdd();
    expect(actions[0]?.[0]).toBe("add");
  });

  it("sends no action while the fetch runs", () => {
    const { actions } = renderDialog({ job: exampleRunningJob });
    pressAdd();
    expect(actions).toEqual([]);
  });

  it("offers to close rather than cancel while the fetch runs", () => {
    renderDialog({ job: exampleRunningJob });
    expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull();
  });

  it("shows the running fetch's latest step", () => {
    renderDialog({ job: exampleRunningJob });
    expect(screen.getByRole("status").textContent).toContain(
      "downloading the video and subtitles",
    );
  });

  it("fills the progress bar to the fetch's fraction", () => {
    renderDialog({ job: exampleRunningJob });
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe(
      "45",
    );
  });

  it("lists what the plugin and its commands reported", () => {
    renderDialog({ job: exampleRunningJob });
    const lines = screen.getByRole("list", { name: "Log" });
    expect(lines.textContent).toContain("[download]  45.0% of   48.21MiB");
  });

  it("shows why a fetch failed", () => {
    renderDialog({ job: exampleFailedJob });
    expect(screen.getByRole("alert").textContent).toContain("Private video");
  });

  it("opens the log of a failed fetch", () => {
    renderDialog({ job: exampleFailedJob });
    expect(screen.getByText("Log").closest("details")?.open).toBe(true);
  });

  it("shows why the form could not be shown or the fetch started", () => {
    renderDialog({ error: "The server has no media directory" });
    expect(screen.getByRole("alert").textContent).toBe(
      "The server has no media directory",
    );
  });
});
