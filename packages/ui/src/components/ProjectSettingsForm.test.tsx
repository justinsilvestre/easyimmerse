import type { ProjectSettings } from "@easyimmerse/types";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { flashcardPresetFields } from "../flashcardPresetFields.ts";
import { createDefaultProjectSettings } from "./createDefaultProjectSettings.ts";
import { ProjectSettingsForm } from "./ProjectSettingsForm.tsx";

afterEach(cleanup);

function renderForm(initialSettings = createDefaultProjectSettings("en")) {
  const submitted: ProjectSettings[] = [];
  const cancellations: null[] = [];
  render(
    <ProjectSettingsForm
      initialSettings={initialSettings}
      submitLabel="Create project"
      onSubmit={(settings) => submitted.push(settings)}
      onCancel={() => cancellations.push(null)}
    />,
  );
  return { submitted, cancellations };
}

const filledSettings: ProjectSettings = {
  ...createDefaultProjectSettings("en"),
  name: "Dark",
  target_language: "de",
};

const findSubmitButton = () =>
  screen.getByRole("button", { name: "Create project" });

function typeName(name: string) {
  fireEvent.change(screen.getByRole("textbox", { name: "Name" }), {
    target: { value: name },
  });
}

describe("ProjectSettingsForm", () => {
  it("submits the edited settings", () => {
    const { submitted } = renderForm();
    typeName("Midnight Diner");
    fireEvent.change(
      screen.getByRole("combobox", { name: "Target language" }),
      { target: { value: "ja" } },
    );
    fireEvent.click(screen.getByRole("checkbox", { name: "Screenshot" }));
    fireEvent.click(findSubmitButton());
    expect(submitted).toEqual([
      {
        name: "Midnight Diner",
        target_language: "ja",
        translation_language: "en",
        flashcard_settings: {
          included_fields: [
            "word",
            "l1_definition",
            "context",
            "context_translation",
            "context_audio",
          ],
          default_tags: [],
          tag_with_media_name: true,
          use_tts_when_no_audio: false,
        },
      },
    ]);
  });

  it("trims the submitted name", () => {
    const { submitted } = renderForm(filledSettings);
    typeName("  Dark  ");
    fireEvent.click(findSubmitButton());
    expect(submitted[0]?.name).toBe("Dark");
  });

  it("applies the fields of a chosen preset", () => {
    const { submitted } = renderForm(filledSettings);
    fireEvent.click(screen.getByRole("radio", { name: "Beginner" }));
    fireEvent.click(findSubmitButton());
    expect(submitted[0]?.flashcard_settings.included_fields).toEqual(
      flashcardPresetFields.beginner,
    );
  });

  it("updates the preview as fields are checked", () => {
    renderForm(filledSettings);
    fireEvent.click(
      screen.getByRole("checkbox", { name: "Word pronunciation" }),
    );
    expect(screen.queryByText("/kæt/")).not.toBeNull();
  });

  it("disables submitting while the name is blank", () => {
    renderForm({ ...filledSettings, name: "  " });
    expect(findSubmitButton()).toHaveProperty("disabled", true);
  });

  it("explains what is missing", () => {
    renderForm(createDefaultProjectSettings("en"));
    expect(
      screen.queryByText("Add a name and a target language to continue."),
    ).not.toBeNull();
  });

  it("enables submitting once the required settings are filled", () => {
    renderForm(filledSettings);
    expect(findSubmitButton()).toHaveProperty("disabled", false);
  });

  it("reports a cancellation", () => {
    const { cancellations } = renderForm();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(cancellations).toHaveLength(1);
  });
});
