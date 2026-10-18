import type { FormInput, PluginForm } from "@easyimmerse/types";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { TestStoreProvider } from "../testSupport/TestStoreProvider.tsx";
import { exampleImportForm, exampleNoticeForm } from "./examplePluginForms.ts";
import { PluginFormDialog } from "./PluginFormDialog.tsx";

afterEach(cleanup);

type Submission = { actionId: string; input: FormInput[] };

function renderDialog(
  form: PluginForm | null = exampleImportForm,
  isBusy = false,
) {
  const submissions: Submission[] = [];
  let closings = 0;
  const dialog = (shown: PluginForm | null) => (
    <PluginFormDialog
      form={shown}
      fallbackTitle="Add from a video site"
      loadingMessage="Loading…"
      error={null}
      isBusy={isBusy}
      onAction={(actionId, input) => submissions.push({ actionId, input })}
      onClose={() => {
        closings += 1;
      }}
    />
  );
  const { rerender } = render(dialog(form), {
    wrapper: TestStoreProvider,
  });
  return {
    submissions,
    closings: () => closings,
    showForm: (next: PluginForm) => rerender(dialog(next)),
  };
}

const press = (name: string) =>
  fireEvent.click(screen.getByRole("button", { name }));

const submittedValues = (submissions: Submission[], field: string) =>
  submissions[0]?.input.find((entry) => entry.field === field)?.values;

describe("PluginFormDialog", () => {
  it("is named after the form", () => {
    renderDialog();
    expect(screen.getByRole("dialog").getAttribute("aria-labelledby")).toBe(
      screen.getByRole("heading", { name: "Import from a video site" }).id,
    );
  });

  it("is named after the fallback title while there is no form", () => {
    renderDialog(null);
    expect(
      screen.getByRole("heading", { name: "Add from a video site" }),
    ).toBeTruthy();
  });

  it("submits the values the form starts out with", () => {
    const { submissions } = renderDialog();
    press("Import");
    expect(submissions[0]).toEqual({
      actionId: "import",
      input: [
        { field: "locator", values: [""] },
        { field: "quality", values: ["best"] },
        { field: "subtitles", values: ["ja"] },
        { field: "keep-original", values: ["false"] },
        { field: "session", values: ["session-42"] },
      ],
    });
  });

  it("submits the text typed into a text field", () => {
    const { submissions } = renderDialog();
    fireEvent.change(screen.getByLabelText("URL"), {
      target: { value: "https://example.com/v" },
    });
    press("Import");
    expect(submittedValues(submissions, "locator")).toEqual([
      "https://example.com/v",
    ]);
  });

  it("submits the option chosen in a choose-one field", () => {
    const { submissions } = renderDialog();
    fireEvent.change(screen.getByLabelText("Quality"), {
      target: { value: "audio" },
    });
    press("Import");
    expect(submittedValues(submissions, "quality")).toEqual(["audio"]);
  });

  it("submits the options checked in a choose-many field", () => {
    const { submissions } = renderDialog();
    fireEvent.click(screen.getByLabelText("Japanese"));
    fireEvent.click(screen.getByLabelText(/English/));
    press("Import");
    expect(submittedValues(submissions, "subtitles")).toEqual(["en"]);
  });

  it("submits a switched-on toggle as true", () => {
    const { submissions } = renderDialog();
    fireEvent.click(screen.getByLabelText(/Keep the original file/));
    press("Import");
    expect(submittedValues(submissions, "keep-original")).toEqual(["true"]);
  });

  it("sends a hidden field's value back unchanged", () => {
    const { submissions } = renderDialog();
    press("Import");
    expect(submittedValues(submissions, "session")).toEqual(["session-42"]);
  });

  it("shows nothing for a hidden field", () => {
    renderDialog();
    expect(screen.queryByText("Session")).toBeNull();
  });

  it("sends nothing for a note", () => {
    const { submissions } = renderDialog(exampleNoticeForm);
    press("Try again");
    expect(submissions[0]?.input).toEqual([]);
  });

  it("presses a secondary action with its own id", () => {
    const { submissions } = renderDialog();
    press("Preview");
    expect(submissions[0]?.actionId).toBe("preview");
  });

  it("presses the primary action when the form is submitted from a field", () => {
    const { submissions } = renderDialog();
    fireEvent.submit(screen.getByLabelText("URL"));
    expect(submissions[0]?.actionId).toBe("import");
  });

  it("sends nothing while busy", () => {
    const { submissions } = renderDialog(exampleImportForm, true);
    press("Import");
    expect(submissions).toEqual([]);
  });

  it("starts afresh when a new form arrives", () => {
    const { submissions, showForm } = renderDialog();
    fireEvent.change(screen.getByLabelText("URL"), {
      target: { value: "https://example.com/v" },
    });
    showForm({ ...exampleImportForm });
    press("Import");
    expect(submittedValues(submissions, "locator")).toEqual([""]);
  });

  it("closes when its close button is pressed", () => {
    const { closings } = renderDialog();
    press("Cancel");
    expect(closings()).toBe(1);
  });
});
