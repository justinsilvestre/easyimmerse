import type { AnkiNote, AnkiNoteType } from "@easyimmerse/types";
import type { AnkiConnectRequest } from "./ankiConnect.ts";

/** A note as AnkiConnect adds it. Duplicates of the first field are allowed, since two flashcards may share a word. */
export type AnkiConnectNote = {
  deckName: string;
  modelName: string;
  fields: Record<string, string>;
  tags: string[];
  options: { allowDuplicate: true };
};

const action = (
  name: string,
  params: Record<string, unknown> = {},
): AnkiConnectRequest => ({ action: name, version: 6, params });

/** Builds the AnkiConnect actions the app sends. */
export const ankiConnectActions = {
  version: () => action("version"),
  requestPermission: () => action("requestPermission"),
  deckNames: () => action("deckNames"),
  createDeck: (deck: string) => action("createDeck", { deck }),
  modelNames: () => action("modelNames"),
  /** Creates a note type with its fields, its card templates and its styling. */
  createModel: ({ name, fields, templates, css }: AnkiNoteType) =>
    action("createModel", {
      modelName: name,
      inOrderFields: fields,
      css,
      isCloze: false,
      cardTemplates: templates.map((template) => ({
        Name: template.name,
        Front: template.front,
        Back: template.back,
      })),
    }),
  /** Stores a media file from its bytes in base64, replacing a file of the same name. */
  storeMediaFile: (filename: string, data: string) =>
    action("storeMediaFile", { filename, data }),
  findNotes: (query: string) => action("findNotes", { query }),
  /** Runs several actions in one request; each answers `{ result, error }`. */
  multi: (requests: readonly AnkiConnectRequest[]) =>
    action("multi", { actions: requests }),
  canAddNotesWithErrorDetail: (notes: readonly AnkiConnectNote[]) =>
    action("canAddNotesWithErrorDetail", { notes }),
  addNotes: (notes: readonly AnkiConnectNote[]) =>
    action("addNotes", { notes }),
  updateNoteFields: (id: number, fields: Record<string, string>) =>
    action("updateNoteFields", { note: { id, fields } }),
  /** Deletes notes with their cards. Anki passes over an id it has no note for. */
  deleteNotes: (noteIds: readonly number[]) =>
    action("deleteNotes", { notes: noteIds }),
};

/** Names each of a note's values by its field in the note type. */
export function fieldsOf(
  noteType: AnkiNoteType,
  note: AnkiNote,
): Record<string, string> {
  return Object.fromEntries(
    noteType.fields.map((field, index) => [field, note.fields[index] ?? ""]),
  );
}

/** Returns a note as AnkiConnect adds it to the deck. */
export function connectNoteOf(
  deckName: string,
  noteType: AnkiNoteType,
  note: AnkiNote,
): AnkiConnectNote {
  return {
    deckName,
    modelName: noteType.name,
    fields: fieldsOf(noteType, note),
    tags: note.tags,
    options: { allowDuplicate: true },
  };
}
