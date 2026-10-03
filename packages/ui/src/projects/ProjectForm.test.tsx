import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { fieldsOfPreset } from "../flashcards/flashcardPresets.ts";
import { ProjectForm, type ProjectFormValues } from "./ProjectForm.tsx";

afterEach(cleanup);

const initialValues: ProjectFormValues = {
  name: "",
  targetLanguage: "de",
  translationLanguage: "en",
  flashcardFields: fieldsOfPreset("intermediate"),
  defaultTags: [],
  fillsAudioWithTts: false,
};

function renderForm(
  onSubmit: (values: ProjectFormValues) => void = () => undefined,
) {
  render(
    <ProjectForm
      initialValues={initialValues}
      submitLabel="Create"
      onSubmit={onSubmit}
      onCancel={() => undefined}
    />,
  );
}

function isChecked(label: string): boolean {
  return (screen.getByLabelText(label) as HTMLInputElement).checked;
}

describe("ProjectForm", () => {
  describe("when the beginner preset is chosen", () => {
    it("includes the pronunciation fields", () => {
      renderForm();
      fireEvent.click(screen.getByLabelText("Beginner"));
      expect(isChecked("Word pronunciation")).toBe(true);
    });
  });

  describe("when the advanced preset is chosen", () => {
    it("excludes the definition in the user's language", () => {
      renderForm();
      fireEvent.click(screen.getByLabelText("Advanced"));
      expect(isChecked("Definition in your language")).toBe(false);
    });
  });

  describe("when a field of a preset is unchecked", () => {
    it("switches the preset to custom", () => {
      renderForm();
      fireEvent.click(screen.getByLabelText("Sentence translation"));
      expect(isChecked("Custom")).toBe(true);
    });
  });

  it("keeps a trailing comma in the default tags field, so another tag can follow", () => {
    renderForm();
    fireEvent.change(screen.getByLabelText("Default tags"), {
      target: { value: "tv," },
    });
    expect(
      (screen.getByLabelText("Default tags") as HTMLInputElement).value,
    ).toBe("tv,");
  });

  it("shows the default tags on the example flashcard", () => {
    renderForm();
    fireEvent.change(screen.getByLabelText("Default tags"), {
      target: { value: "tv, dark" },
    });
    expect(screen.getByRole("list", { name: "Tags" }).textContent).toBe(
      "tvdarksample",
    );
  });

  it("submits the edited values", () => {
    const submitted: string[] = [];
    renderForm((values) => submitted.push(values.name));
    fireEvent.change(screen.getByLabelText("Project name"), {
      target: { value: "German" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create" }));
    expect(submitted).toEqual(["German"]);
  });
});
