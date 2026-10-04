import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { exampleFlashcard, exampleLanguages } from "./exampleFlashcard.ts";
import { FlashcardEditor } from "./FlashcardEditor.tsx";
import type { FlashcardContent, FlashcardFieldKey } from "./flashcardFields.ts";
import { fieldsOfPreset } from "./flashcardPresets.ts";

afterEach(cleanup);

type OnSave = (
  content: FlashcardContent,
  fields: readonly FlashcardFieldKey[],
) => void;

function renderEditor(onSave: OnSave = () => undefined) {
  render(
    <FlashcardEditor
      initialContent={exampleFlashcard}
      initialFields={fieldsOfPreset("intermediate")}
      languages={exampleLanguages}
      waveform={{
        windows: new Map([[0, new Uint8Array(3000).fill(128)]]),
        durationMs: 24_000,
      }}
      onSave={onSave}
      onDelete={() => undefined}
      onClose={() => undefined}
    />,
  );
}

const openMoreFields = () =>
  fireEvent.click(screen.getByRole("button", { name: "More fields" }));

describe("FlashcardEditor", () => {
  it("hides the fields excluded by the flashcard settings", () => {
    renderEditor();
    expect(screen.queryByLabelText("Word pronunciation")).toBeNull();
  });

  it("keeps the fields menu closed at first", () => {
    renderEditor();
    expect(
      screen.queryByRole("menuitemcheckbox", { name: "Word pronunciation" }),
    ).toBeNull();
  });

  it("shows an excluded field once it is checked in the menu", () => {
    renderEditor();
    openMoreFields();
    fireEvent.click(
      screen.getByRole("menuitemcheckbox", { name: "Word pronunciation" }),
    );
    expect(screen.getByLabelText("Word pronunciation")).not.toBeNull();
  });

  it("hides an included field once it is unchecked in the menu", () => {
    renderEditor();
    openMoreFields();
    fireEvent.click(
      screen.getByRole("menuitemcheckbox", { name: "Definition (en)" }),
    );
    expect(screen.queryByLabelText("Definition (en)")).toBeNull();
  });

  it("keeps the fields menu open after a field is toggled", () => {
    renderEditor();
    openMoreFields();
    fireEvent.click(
      screen.getByRole("menuitemcheckbox", { name: "Word pronunciation" }),
    );
    expect(screen.getByRole("menu")).not.toBeNull();
  });

  it("labels a definition with its language", () => {
    renderEditor();
    expect(screen.getByLabelText("Definition (en)")).not.toBeNull();
  });

  it("saves the edited text", () => {
    const saved: string[] = [];
    renderEditor((content) => saved.push(content.word));
    fireEvent.change(screen.getByLabelText("Word (de)"), {
      target: { value: "Hunger" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(saved).toEqual(["Hunger"]);
  });

  it("saves a tag typed with a comma after it", () => {
    const saved: string[][] = [];
    renderEditor((content) => saved.push(content.tags));
    fireEvent.change(screen.getByLabelText("Tags"), {
      target: { value: "hunger," },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(saved[0]).toContain("hunger");
  });

  it("saves the clip moved on the waveform", () => {
    const saved: (number | undefined)[] = [];
    renderEditor((content) => saved.push(content.audio_context?.start_ms));
    fireEvent.keyDown(screen.getByRole("slider", { name: "Clip start" }), {
      key: "ArrowLeft",
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(saved).toEqual([1650]);
  });

  it("saves the screenshot time moved on the waveform", () => {
    const saved: (number | undefined)[] = [];
    renderEditor((content) => saved.push(content.screenshot?.at_ms));
    fireEvent.keyDown(screen.getByRole("slider", { name: "Screenshot time" }), {
      key: "ArrowRight",
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(saved).toEqual([6900]);
  });

  it("excludes the screenshot when its image is clicked", () => {
    renderEditor();
    fireEvent.click(screen.getByAltText("Screenshot from the video"));
    expect(screen.getByLabelText("Include the screenshot")).toHaveProperty(
      "checked",
      false,
    );
  });

  it("keeps the screenshot in view after it is unchecked", () => {
    renderEditor();
    fireEvent.click(screen.getByLabelText("Include the screenshot"));
    expect(screen.getByLabelText("Include the screenshot")).not.toBeNull();
  });

  it("drops the screenshot from the saved fields when it is unchecked", () => {
    const saved: (readonly string[])[] = [];
    renderEditor((_content, fields) => saved.push(fields));
    fireEvent.click(screen.getByLabelText("Include the screenshot"));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(saved[0]).not.toContain("screenshot");
  });
});
