import type { FlashcardContent, FlashcardFieldKey } from "@easyimmerse/types";
import { cleanup, fireEvent, screen, within } from "@testing-library/react";
import { useReducer } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { renderWithAppStore } from "../testSupport/renderWithAppStore.tsx";
import { reduceEditor } from "./editFlashcard.ts";
import {
  exampleFlashcard,
  exampleLanguages,
  exampleScreenshotUrl,
} from "./exampleFlashcard.ts";
import { FlashcardEditor } from "./FlashcardEditor.tsx";
import { fieldsOfPreset } from "./flashcardPresets.ts";

afterEach(cleanup);

type OnSave = (
  content: FlashcardContent,
  fields: readonly FlashcardFieldKey[],
) => void;

/** Holds the editor's state as its caller would, and reports that state on save. */
function EditorWithState({ onSave }: { onSave: OnSave }) {
  const [state, dispatch] = useReducer(reduceEditor, {
    content: exampleFlashcard,
    includedFields: fieldsOfPreset("intermediate"),
  });
  return (
    <FlashcardEditor
      state={state}
      dispatch={dispatch}
      languages={exampleLanguages}
      waveform={{ peaks: [0.1, 0.5, 0.9, 0.3], durationMs: 24_000 }}
      screenshotUrl={exampleScreenshotUrl}
      onSave={() => onSave(state.content, state.includedFields)}
      onDelete={() => undefined}
      onClose={() => undefined}
    />
  );
}

function renderEditor(onSave: OnSave = () => undefined) {
  renderWithAppStore(<EditorWithState onSave={onSave} />);
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

function renderWithSaveStatus(
  saveStatus: "idle" | "waitingForDefinitions" | "saving",
  onSave: () => void = () => undefined,
) {
  renderWithAppStore(
    <FlashcardEditor
      state={{
        content: exampleFlashcard,
        includedFields: fieldsOfPreset("intermediate"),
      }}
      dispatch={() => undefined}
      languages={exampleLanguages}
      waveform={null}
      saveStatus={saveStatus}
      onSave={onSave}
      onDelete={() => undefined}
      onClose={() => undefined}
    />,
  );
}

/** Renders the editor with its clip and screenshot shown, recording the actions it dispatches. */
function renderWithMedia(saveStatus: "idle" | "saving") {
  const actions: string[] = [];
  renderWithAppStore(
    <FlashcardEditor
      state={{
        content: exampleFlashcard,
        includedFields: [...fieldsOfPreset("intermediate"), "screenshot"],
      }}
      dispatch={(action) => actions.push(action.type)}
      languages={exampleLanguages}
      waveform={{ peaks: [0.1, 0.5, 0.9, 0.3], durationMs: 24_000 }}
      screenshotUrl={exampleScreenshotUrl}
      saveStatus={saveStatus}
      onSave={() => undefined}
      onDelete={() => undefined}
      onClose={() => undefined}
    />,
  );
  return actions;
}

/** Renders the editor, recording presses of Close and Delete. */
function renderWithLeavingButtons(
  saveStatus: "idle" | "waitingForDefinitions" | "saving",
  { isNew = false, hasSaveFailed = false } = {},
) {
  const presses: string[] = [];
  renderWithAppStore(
    <FlashcardEditor
      state={{
        content: exampleFlashcard,
        includedFields: fieldsOfPreset("intermediate"),
      }}
      dispatch={() => undefined}
      languages={exampleLanguages}
      waveform={null}
      saveStatus={saveStatus}
      isNew={isNew}
      hasSaveFailed={hasSaveFailed}
      onSave={() => undefined}
      onDelete={() => presses.push("delete")}
      onClose={() => presses.push("close")}
    />,
  );
  return presses;
}

describe("FlashcardEditor's Close and Delete buttons", () => {
  const buttonNames = ["Close without saving", "Delete"];

  describe.each(["saving", "waitingForDefinitions"] as const)(
    "while the save status is %s",
    (saveStatus) => {
      it.each(buttonNames)("mark %s unavailable", (name) => {
        renderWithLeavingButtons(saveStatus);
        expect(
          screen.getByRole("button", { name }).getAttribute("aria-disabled"),
        ).toBe("true");
      });

      it.each(buttonNames)("ignore %s", (name) => {
        const presses = renderWithLeavingButtons(saveStatus);
        fireEvent.click(screen.getByRole("button", { name }));
        expect(presses).toEqual([]);
      });
    },
  );

  it("work before Save is pressed", () => {
    const presses = renderWithLeavingButtons("idle");
    fireEvent.click(
      screen.getByRole("button", { name: "Close without saving" }),
    );
    expect(presses).toEqual(["close"]);
  });

  it("offer no Delete for a new flashcard that was never saved", () => {
    renderWithLeavingButtons("idle", { isNew: true });
    expect(screen.queryByRole("button", { name: "Delete" })).toBeNull();
  });
});

describe("FlashcardEditor's Delete", () => {
  const pressDelete = () =>
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
  const confirmDialog = () =>
    screen.getByRole("dialog", {
      hidden: true,
      name: "Delete this flashcard?",
    });

  it("asks before deleting", () => {
    const presses = renderWithLeavingButtons("idle");
    pressDelete();
    expect(presses).toEqual([]);
  });

  it("names the word in its question", () => {
    renderWithLeavingButtons("idle");
    pressDelete();
    expect(confirmDialog().textContent).toContain(`“${exampleFlashcard.word}”`);
  });

  it("deletes once the deletion is confirmed", () => {
    const presses = renderWithLeavingButtons("idle");
    pressDelete();
    fireEvent.click(
      within(confirmDialog()).getByRole("button", {
        hidden: true,
        name: "Delete",
      }),
    );
    expect(presses).toEqual(["delete"]);
  });

  it("deletes nothing once the question is cancelled", () => {
    const presses = renderWithLeavingButtons("idle");
    pressDelete();
    fireEvent.click(
      within(confirmDialog()).getByRole("button", {
        hidden: true,
        name: "Cancel",
      }),
    );
    expect(presses).toEqual([]);
  });

  it("closes the question once it is cancelled", () => {
    renderWithLeavingButtons("idle");
    pressDelete();
    fireEvent.click(
      within(confirmDialog()).getByRole("button", {
        hidden: true,
        name: "Cancel",
      }),
    );
    expect(screen.queryByRole("dialog", { hidden: true })).toBeNull();
  });
});

describe("FlashcardEditor after a failed save", () => {
  it("tells that the save failed", () => {
    renderWithLeavingButtons("idle", { hasSaveFailed: true });
    expect(screen.getByRole("status").textContent).toBe(
      "Could not save the flashcard. Press Save to try again.",
    );
  });

  it("tells of the new save instead once Save is pressed again", () => {
    renderWithLeavingButtons("saving", { hasSaveFailed: true });
    expect(screen.getByRole("status").textContent).toBe("Saving…");
  });
});

describe("FlashcardEditor while the flashcard is being saved", () => {
  it("ignores the screenshot checkbox", () => {
    const actions = renderWithMedia("saving");
    fireEvent.click(
      screen.getByRole("checkbox", { name: "Include the screenshot" }),
    );
    expect(actions).toEqual([]);
  });

  it("marks the screenshot checkbox unavailable", () => {
    renderWithMedia("saving");
    expect(
      screen
        .getByRole("checkbox", { name: "Include the screenshot" })
        .getAttribute("aria-disabled"),
    ).toBe("true");
  });

  it("makes the clip's handles inert", () => {
    renderWithMedia("saving");
    expect(
      screen
        .getByRole("group", { name: "Sentence audio" })
        .hasAttribute("inert"),
    ).toBe(true);
  });

  it("marks the More fields button unavailable", () => {
    renderWithMedia("saving");
    expect(
      screen
        .getByRole("button", { name: "More fields" })
        .getAttribute("aria-disabled"),
    ).toBe("true");
  });

  it("does not open the More fields menu", () => {
    renderWithMedia("saving");
    fireEvent.click(screen.getByRole("button", { name: "More fields" }));
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("leaves the clip's handles usable until Save is pressed", () => {
    renderWithMedia("idle");
    expect(
      screen
        .getByRole("group", { name: "Sentence audio" })
        .hasAttribute("inert"),
    ).toBe(false);
  });
});

describe("FlashcardEditor's save status", () => {
  it("is never hidden while empty, so that its text is announced when it appears", () => {
    renderWithSaveStatus("idle");
    expect(screen.getByRole("status").className).not.toMatch(/hidden/);
  });

  it("makes the text fields read-only while the flashcard is being saved", () => {
    renderWithSaveStatus("saving");
    expect(
      screen
        .getAllByRole("textbox")
        .every((field) => field.hasAttribute("readonly")),
    ).toBe(true);
  });

  it("makes the text fields read-only while the save waits for definitions", () => {
    renderWithSaveStatus("waitingForDefinitions");
    expect(
      screen
        .getAllByRole("textbox")
        .every((field) => field.hasAttribute("readonly")),
    ).toBe(true);
  });

  it("leaves the text fields editable until Save is pressed", () => {
    renderWithSaveStatus("idle");
    expect(
      screen
        .getAllByRole("textbox")
        .some((field) => field.hasAttribute("readonly")),
    ).toBe(false);
  });
});

describe("FlashcardEditor while its save waits for definitions", () => {
  function renderWaiting(onSave: () => void) {
    renderWithAppStore(
      <FlashcardEditor
        state={{
          content: exampleFlashcard,
          includedFields: fieldsOfPreset("intermediate"),
        }}
        dispatch={() => undefined}
        languages={exampleLanguages}
        waveform={null}
        saveStatus="waitingForDefinitions"
        onSave={onSave}
        onDelete={() => undefined}
        onClose={() => undefined}
      />,
    );
  }

  it("ignores Save", () => {
    let saveCount = 0;
    renderWaiting(() => {
      saveCount += 1;
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(saveCount).toBe(0);
  });

  it("keeps Save focusable, marking it unavailable instead", () => {
    renderWaiting(() => undefined);
    expect(
      screen
        .getByRole("button", { name: "Save" })
        .getAttribute("aria-disabled"),
    ).toBe("true");
  });

  it("describes Save with what it waits for", () => {
    renderWaiting(() => undefined);
    expect(
      screen
        .getByRole("button", { name: "Save" })
        .getAttribute("aria-describedby"),
    ).toBe(screen.getByRole("status").id);
  });
});
