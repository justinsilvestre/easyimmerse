import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { fieldsOfPreset } from "../flashcards/flashcardPresets.ts";
import type { ProjectFormValues } from "./editProject.ts";
import { ProjectForm } from "./ProjectForm.tsx";

afterEach(cleanup);

const initialValues: ProjectFormValues = {
  name: "",
  targetLanguage: "de",
  translationLanguage: "en",
  flashcardFields: fieldsOfPreset("intermediate"),
  defaultTags: [],
  tagsMediaName: true,
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

const findPreviewTags = () =>
  screen.getByRole("list", { name: "Tags" }).textContent;

describe("ProjectForm", () => {
  describe("when the beginner preset is chosen", () => {
    it("includes the pronunciation fields", () => {
      renderForm();
      fireEvent.click(screen.getByLabelText("Beginner"));
      expect(isChecked("Word pronunciation")).toBe(true);
    });
  });

  describe("when the advanced preset is chosen", () => {
    it("excludes the definition in the translation language", () => {
      renderForm();
      fireEvent.click(screen.getByLabelText("Advanced"));
      expect(isChecked("Definition (en)")).toBe(false);
    });
  });

  describe("when a field of a preset is unchecked", () => {
    it("switches the preset to custom", () => {
      renderForm();
      fireEvent.click(screen.getByLabelText("Sentence (en)"));
      expect(isChecked("Custom")).toBe(true);
    });
  });

  it("groups the fields under the names of the languages", () => {
    renderForm();
    expect(screen.getByRole("group", { name: "German" })).not.toBeNull();
  });

  it("relabels the fields when the target language changes", () => {
    renderForm();
    fireEvent.change(screen.getByLabelText("Target language"), {
      target: { value: "ja" },
    });
    expect(screen.getByLabelText("Sentence (ja)")).not.toBeNull();
  });

  it("shows the default tags on the example flashcard", () => {
    renderForm();
    fireEvent.change(screen.getByLabelText("Default tags"), {
      target: { value: "tv," },
    });
    expect(findPreviewTags()).toBe("tvdark-s01e01");
  });

  it("drops the media name tag from the example when that option is off", () => {
    renderForm();
    fireEvent.click(
      screen.getByLabelText(
        "Tag each flashcard with the name of its media file",
      ),
    );
    expect(screen.queryByRole("list", { name: "Tags" })).toBeNull();
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
