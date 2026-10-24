import { describe, expect, it } from "vitest";
import { deletionDescription } from "./FlashcardDeleteDialog.tsx";

const base =
  "The flashcard for “Haus” is deleted from the project. The deletion cannot be undone.";

describe("deletionDescription", () => {
  it("says only that the flashcard is deleted when its fate in Anki is not known", () => {
    expect(deletionDescription("Haus", null)).toBe(base);
  });

  it("says nothing of Anki for a flashcard that never reached it", () => {
    expect(
      deletionDescription("Haus", { note: "none", wasPackaged: false }),
    ).toBe(base);
  });

  it("says that AnkiConnect deletes the note", () => {
    expect(
      deletionDescription("Haus", {
        note: "deletedByAnkiConnect",
        wasPackaged: false,
      }),
    ).toBe(`${base} Its note is deleted from Anki too.`);
  });

  it("says that AnkiConnect deletes the note once easyImmerse reaches Anki", () => {
    expect(
      deletionDescription("Haus", {
        note: "deletedByAnkiConnectLater",
        wasPackaged: false,
      }),
    ).toBe(
      `${base} Its note is deleted from Anki the next time easyImmerse reaches Anki.`,
    );
  });

  it("says that the note stays in Anki, and that the project screen keeps a record of the deletion", () => {
    expect(
      deletionDescription("Haus", { note: "staysListed", wasPackaged: false }),
    ).toBe(
      `${base} Its corresponding Anki note stays in Anki until you delete it there or turn AnkiConnect on. A record of deleted flashcards is kept for your reference in the project screen.`,
    );
  });

  it("says that the note stays in Anki until it is deleted there", () => {
    expect(
      deletionDescription("Haus", { note: "stays", wasPackaged: false }),
    ).toBe(
      `${base} Its corresponding Anki note stays in Anki until you delete it there.`,
    );
  });

  it("says that AnkiConnect deletes the note of a flashcard imported into Anki from a package", () => {
    expect(
      deletionDescription("Haus", {
        note: "anyDeletedByAnkiConnect",
        wasPackaged: true,
      }),
    ).toBe(
      `${base} If you imported it into Anki from a package, its note there is deleted too. Importing a package made before now that holds it would bring it back.`,
    );
  });

  it("says that AnkiConnect deletes the note of a flashcard imported into Anki from a package once easyImmerse reaches Anki", () => {
    expect(
      deletionDescription("Haus", {
        note: "anyDeletedByAnkiConnectLater",
        wasPackaged: true,
      }),
    ).toBe(
      `${base} If you imported it into Anki from a package, its note there is deleted the next time easyImmerse reaches Anki. Importing a package made before now that holds it would bring it back.`,
    );
  });

  it("says that importing an old package would bring the flashcard back", () => {
    expect(
      deletionDescription("Haus", { note: "none", wasPackaged: true }),
    ).toBe(
      `${base} Importing a package made before now that holds it would bring it back.`,
    );
  });
});
