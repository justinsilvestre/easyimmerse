import type { FormInput, PluginForm } from "@easyimmerse/types";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { exampleImportForm, exampleNoticeForm } from "./examplePluginForms.ts";
import { PluginFormView } from "./PluginFormView.tsx";

afterEach(cleanup);

type Submission = { actionId: string; input: FormInput[] };

function renderView(form: PluginForm = exampleImportForm, isBusy = false) {
  const submissions: Submission[] = [];
  let closings = 0;
  const view = (shown: PluginForm) => (
    <PluginFormView
      form={shown}
      isBusy={isBusy}
      onAction={(actionId, input) => submissions.push({ actionId, input })}
      onClose={() => {
        closings += 1;
      }}
    />
  );
  const { rerender } = render(view(form));
  return {
    submissions,
    closings: () => closings,
    showForm: (next: PluginForm) => rerender(view(next)),
  };
}

const press = (name: string) =>
  fireEvent.click(screen.getByRole("button", { name }));

const submittedValues = (submissions: Submission[], field: string) =>
  submissions[0]?.input.find((entry) => entry.field === field)?.values;

describe("PluginFormView", () => {
  it("submits the values the form starts out with", () => {
    const { submissions } = renderView();
    press("Import");
    expect(submissions[0]).toEqual({
      actionId: "import",
      input: [
        { field: "locator", values: [""] },
        { field: "quality", values: ["best"] },
        { field: "subtitles", values: ["ja"] },
        { field: "keep-original", values: ["false"] },
      ],
    });
  });

  it("submits the text typed into a text field", () => {
    const { submissions } = renderView();
    fireEvent.change(screen.getByLabelText("URL"), {
      target: { value: "https://example.com/v" },
    });
    press("Import");
    expect(submittedValues(submissions, "locator")).toEqual([
      "https://example.com/v",
    ]);
  });

  it("submits the option chosen in a choose-one field", () => {
    const { submissions } = renderView();
    fireEvent.change(screen.getByLabelText("Quality"), {
      target: { value: "audio" },
    });
    press("Import");
    expect(submittedValues(submissions, "quality")).toEqual(["audio"]);
  });

  it("submits the options checked in a choose-many field", () => {
    const { submissions } = renderView();
    fireEvent.click(screen.getByLabelText("Japanese"));
    fireEvent.click(screen.getByLabelText(/English/));
    press("Import");
    expect(submittedValues(submissions, "subtitles")).toEqual(["en"]);
  });

  it("submits a switched-on toggle as true", () => {
    const { submissions } = renderView();
    fireEvent.click(screen.getByLabelText(/Keep the original file/));
    press("Import");
    expect(submittedValues(submissions, "keep-original")).toEqual(["true"]);
  });

  it("sends nothing for a note", () => {
    const { submissions } = renderView(exampleNoticeForm);
    press("Try again");
    expect(submissions[0]?.input).toEqual([]);
  });

  it("disables its actions while busy", () => {
    renderView(exampleImportForm, true);
    expect(
      screen.getByRole<HTMLButtonElement>("button", { name: "Import" })
        .disabled,
    ).toBe(true);
  });

  it("starts afresh when a new form arrives", () => {
    const { submissions, showForm } = renderView();
    fireEvent.change(screen.getByLabelText("URL"), {
      target: { value: "https://example.com/v" },
    });
    showForm({ ...exampleImportForm });
    press("Import");
    expect(submittedValues(submissions, "locator")).toEqual([""]);
  });

  it("closes when its close button is pressed", () => {
    const { closings } = renderView();
    press("Cancel");
    expect(closings()).toBe(1);
  });
});
