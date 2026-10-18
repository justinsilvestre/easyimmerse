import type { AnkiNote, AnkiNoteType } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import { ankiConnectActions, connectNoteOf } from "./ankiConnectActions.ts";

const noteType: AnkiNoteType = {
  id: 1 << 30,
  name: "easyImmerse: Korean",
  fields: ["Word", "Sentence", "easyImmerse id"],
  templates: [{ name: "Card", front: "{{Word}}", back: "{{Sentence}}" }],
  css: ".card {}",
};

const note: AnkiNote = {
  flashcard_id: "f1",
  guid: "abc",
  note_id: 1,
  fields: ["고양이", "고양이가 잔다.", "f1"],
  tags: ["animals"],
  media: [],
};

describe("ankiConnectActions", () => {
  it("creates the note type with its fields, templates and styling", () => {
    expect(ankiConnectActions.createModel(noteType)).toEqual({
      action: "createModel",
      version: 6,
      params: {
        modelName: "easyImmerse: Korean",
        inOrderFields: ["Word", "Sentence", "easyImmerse id"],
        css: ".card {}",
        isCloze: false,
        cardTemplates: [
          { Name: "Card", Front: "{{Word}}", Back: "{{Sentence}}" },
        ],
      },
    });
  });

  it("updates a note's fields and tags by its id", () => {
    expect(ankiConnectActions.updateNote(7, { Word: "개" }, ["verbs"])).toEqual(
      {
        action: "updateNote",
        version: 6,
        params: { note: { id: 7, fields: { Word: "개" }, tags: ["verbs"] } },
      },
    );
  });

  it("runs several actions in one request", () => {
    expect(
      ankiConnectActions.multi([ankiConnectActions.deckNames()]).params,
    ).toEqual({
      actions: [{ action: "deckNames", version: 6, params: {} }],
    });
  });
});

describe("connectNoteOf", () => {
  it("names each value by its field, in the deck, with the note's tags", () => {
    expect(connectNoteOf("Korean", noteType, note)).toEqual({
      deckName: "Korean",
      modelName: "easyImmerse: Korean",
      fields: {
        Word: "고양이",
        Sentence: "고양이가 잔다.",
        "easyImmerse id": "f1",
      },
      tags: ["animals"],
      options: { allowDuplicate: true },
    });
  });
});
