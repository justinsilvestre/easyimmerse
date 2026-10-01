import { resetBackend } from "@easyimmerse/backend";
import {
  actions,
  createNewFlashcard,
  selectFlashcardEditor,
} from "@easyimmerse/state";
import type { NewFlashcard } from "@easyimmerse/types";
import {
  act,
  cleanup,
  fireEvent,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { renderWithAppStore } from "../testSupport/renderWithAppStore.tsx";
import { FlashcardEditor } from "./FlashcardEditor.tsx";

afterEach(() => {
  cleanup();
  resetBackend();
});

function renderEditor(
  card: NewFlashcard | null = createNewFlashcard(),
  flashcardId: string | null = null,
) {
  const saved: [NewFlashcard, string | null][] = [];
  const deleted: (string | null)[] = [];
  const rendered = renderWithAppStore(
    <FlashcardEditor
      onSave={(savedCard, id) => saved.push([savedCard, id])}
      onDelete={(id) => deleted.push(id)}
    />,
  );
  if (card !== null)
    act(() =>
      rendered.store.dispatch(
        actions.flashcardEditorOpened("p1", card, flashcardId),
      ),
    );
  return { ...rendered, saved, deleted };
}

type RenderedEditor = ReturnType<typeof renderEditor>;

function editedCard({ store }: RenderedEditor) {
  const editor = selectFlashcardEditor(store.getState());
  return editor.kind === "editing" ? editor.card : null;
}

const kindsOf = (card: NewFlashcard | null) =>
  card?.fields.map((field) => field.kind);

const clickButton = (name: string) =>
  fireEvent.click(screen.getByRole("button", { name }));

describe("FlashcardEditor", () => {
  it("renders nothing while the editor is closed", () => {
    renderEditor(null);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("is titled as a new flashcard for an unsaved card", () => {
    renderEditor();
    expect(screen.getByRole("dialog", { name: "New flashcard" })).toBeTruthy();
  });

  it("is titled as editing for a saved card", () => {
    renderEditor(createNewFlashcard(), "f1");
    expect(screen.getByRole("dialog", { name: "Edit flashcard" })).toBeTruthy();
  });

  it("shows each text field in a labelled text box", () => {
    renderEditor();
    expect(screen.getByRole("textbox", { name: "Sentence" })).toHaveProperty(
      "value",
      "Die Katze schläft.",
    );
  });

  it("stores an edited field", () => {
    const rendered = renderEditor();
    fireEvent.change(screen.getByRole("textbox", { name: "Word" }), {
      target: { value: "Kater" },
    });
    expect(editedCard(rendered)?.fields[0]).toEqual({
      kind: "word",
      value: "Kater",
    });
  });

  it("shows the clip of the sentence audio", () => {
    renderEditor(
      createNewFlashcard({
        fields: [{ kind: "context_audio", value: "" }],
        clip: { start_ms: 500, end_ms: 1500 },
      }),
    );
    expect(screen.getByText("0:00.5 – 0:01.5")).toBeTruthy();
  });

  it("removes a field with its remove button", () => {
    const rendered = renderEditor();
    clickButton("Remove Sentence");
    expect(kindsOf(editedCard(rendered))).toEqual(["word"]);
  });

  it("offers to add the missing fields in canonical order", () => {
    renderEditor();
    clickButton("Add field");
    const menu = screen.getByRole("list", { name: "Fields to add" });
    expect(
      within(menu)
        .getAllByRole("button")
        .map((button) => button.textContent),
    ).toEqual([
      "Word pronunciation",
      "Definition in your language",
      "Definition in the target language",
      "Sentence translation",
      "Sentence pronunciation",
      "Sentence audio",
      "Screenshot",
    ]);
  });

  it("adds a field picked from the add menu", () => {
    const rendered = renderEditor();
    clickButton("Add field");
    clickButton("Add Sentence translation");
    expect(kindsOf(editedCard(rendered))).toEqual([
      "word",
      "context",
      "context_translation",
    ]);
  });

  it("stores edited tags", () => {
    const rendered = renderEditor();
    const input = screen.getByRole("textbox", { name: "Tags" });
    fireEvent.change(input, { target: { value: "noun" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(editedCard(rendered)?.tags).toEqual(["noun"]);
  });

  describe("with a screenshot field", () => {
    const withScreenshot = (value: string) =>
      createNewFlashcard({ fields: [{ kind: "screenshot", value }] });

    it("requests a frame capture", () => {
      const { effects } = renderEditor(withScreenshot(""));
      clickButton("Capture current frame");
      expect(effects.calls).toContainEqual({ type: "captureFrame" });
    });

    it("shows a captured frame", () => {
      renderEditor(withScreenshot("data:image/png;base64,AAAA"));
      expect(screen.getByRole("img", { name: "Screenshot" })).toBeTruthy();
    });
  });

  describe("when tabbing through the dialog", () => {
    it("moves focus from the last control back to the first", () => {
      renderEditor();
      const save = screen.getByRole("button", { name: "Save" });
      save.focus();
      fireEvent.keyDown(save, { key: "Tab" });
      expect(document.activeElement).toBe(
        screen.getByRole("textbox", { name: "Word" }),
      );
    });

    it("moves focus from the first control back to the last on Shift+Tab", () => {
      renderEditor();
      const word = screen.getByRole("textbox", { name: "Word" });
      word.focus();
      fireEvent.keyDown(word, { key: "Tab", shiftKey: true });
      expect(document.activeElement).toBe(
        screen.getByRole("button", { name: "Save" }),
      );
    });

    it("leaves focus alone between the first and last controls", () => {
      renderEditor();
      const sentence = screen.getByRole("textbox", { name: "Sentence" });
      sentence.focus();
      fireEvent.keyDown(sentence, { key: "Tab" });
      expect(document.activeElement).toBe(sentence);
    });
  });

  describe("when saving", () => {
    it("passes the card and its id to onSave", () => {
      const card = createNewFlashcard();
      const { saved } = renderEditor(card, "f1");
      clickButton("Save");
      expect(saved).toEqual([[card, "f1"]]);
    });

    it("saves on Ctrl+Enter", () => {
      const { saved } = renderEditor();
      fireEvent.keyDown(document, { key: "Enter", ctrlKey: true });
      expect(saved).toHaveLength(1);
    });

    it("includes a tag still typed in the tags input on Ctrl+Enter", () => {
      const { saved } = renderEditor();
      const input = screen.getByRole("textbox", { name: "Tags" });
      fireEvent.change(input, { target: { value: "noun" } });
      fireEvent.keyDown(input, { key: "Enter", ctrlKey: true });
      expect(saved[0]?.[0].tags).toEqual(["noun"]);
    });

    it("saves on Cmd+Enter", () => {
      const { saved } = renderEditor();
      fireEvent.keyDown(document, { key: "Enter", metaKey: true });
      expect(saved).toHaveLength(1);
    });
  });

  describe("when cancelling", () => {
    it("closes the editor with the cancel button", () => {
      const rendered = renderEditor();
      clickButton("Cancel");
      expect(editedCard(rendered)).toBeNull();
    });

    it("closes the editor on Escape", () => {
      const rendered = renderEditor();
      fireEvent.keyDown(document, { key: "Escape" });
      expect(editedCard(rendered)).toBeNull();
    });

    it("stays open on Escape while the lookup is open above it", () => {
      const rendered = renderEditor();
      act(() => rendered.store.dispatch(actions.lookupOpenedForTyping()));
      fireEvent.keyDown(document, { key: "Escape" });
      expect(editedCard(rendered)).not.toBeNull();
    });
  });

  describe("when deleting", () => {
    it("offers no delete button for an unsaved card", () => {
      renderEditor();
      expect(screen.queryByRole("button", { name: "Delete" })).toBeNull();
    });

    it("asks for confirmation before deleting", () => {
      const { deleted } = renderEditor(createNewFlashcard(), "f1");
      clickButton("Delete");
      expect(deleted).toEqual([]);
    });

    it("passes the id to onDelete once confirmed", () => {
      const { deleted } = renderEditor(createNewFlashcard(), "f1");
      clickButton("Delete");
      clickButton("Delete flashcard");
      expect(deleted).toEqual(["f1"]);
    });
  });
});
