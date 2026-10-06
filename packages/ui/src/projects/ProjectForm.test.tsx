import type { ProjectSettings } from "@easyimmerse/types";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fieldsOfPreset } from "../flashcards/flashcardPresets.ts";
import { createFakeMediaQueryList } from "../testSupport/createFakeMediaQueryList.ts";
import { ProjectForm } from "./ProjectForm.tsx";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const initialValues: ProjectSettings = {
  name: "",
  target_language: "de",
  translation_language: "en",
  flashcard_fields: fieldsOfPreset("intermediate"),
  default_tags: [],
  tags_media_name: true,
  fills_audio_with_tts: false,
};

function renderForm(
  onSubmit: (values: ProjectSettings) => void = () => undefined,
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

/** Makes the form see a screen of the given roominess, since the test window counts as roomy by default. */
function pretendScreenIsRoomy(isRoomy: boolean) {
  vi.spyOn(window, "matchMedia").mockReturnValue(
    createFakeMediaQueryList(isRoomy),
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

  describe("on a narrow screen", () => {
    it("shows Custom as the preset once it is chosen", () => {
      pretendScreenIsRoomy(false);
      renderForm();
      fireEvent.click(screen.getByLabelText("Custom"));
      expect(isChecked("Custom")).toBe(true);
    });

    it("goes back to a preset chosen after Custom", () => {
      pretendScreenIsRoomy(false);
      renderForm();
      fireEvent.click(screen.getByLabelText("Custom"));
      fireEvent.click(screen.getByLabelText("Beginner"));
      expect(isChecked("Beginner")).toBe(true);
    });
  });

  describe("on a roomy screen", () => {
    it("offers Custom only once the fields match no preset", () => {
      pretendScreenIsRoomy(true);
      renderForm();
      expect(screen.queryByLabelText("Custom")).toBeNull();
    });

    it("offers Custom once a field of a preset is unchecked", () => {
      pretendScreenIsRoomy(true);
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

  describe("when the translation language is the target language", () => {
    function chooseGermanTranslations() {
      fireEvent.change(screen.getByLabelText("Translation language"), {
        target: { value: "de" },
      });
    }

    it("asks for a different language under the translation language", () => {
      renderForm();
      chooseGermanTranslations();
      expect(
        screen
          .getByLabelText("Translation language")
          .getAttribute("aria-describedby"),
      ).toBe(
        screen.getByText(
          "Choose a different language from the target language.",
        ).id,
      );
    });

    it("marks the submit button as unavailable", () => {
      renderForm();
      chooseGermanTranslations();
      expect(
        screen
          .getByRole("button", { name: "Create" })
          .getAttribute("aria-disabled"),
      ).toBe("true");
    });

    it("does not submit", () => {
      const submitted: string[] = [];
      renderForm((values) => submitted.push(values.name));
      fireEvent.change(screen.getByLabelText("Project name"), {
        target: { value: "German" },
      });
      chooseGermanTranslations();
      fireEvent.click(screen.getByRole("button", { name: "Create" }));
      expect(submitted).toEqual([]);
    });
  });
});
