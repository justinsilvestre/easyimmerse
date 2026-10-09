import { valuesOf } from "./input.js";
import { SUBTITLE_ID, SUBTITLE_NAME } from "./resolve.js";

/** A form with one text field for the locator and an action that imports it. */
export function importForm() {
  const locator = { tag: "text", val: { value: "", placeholder: undefined } };
  return {
    title: "Import from the fixture",
    description: undefined,
    fields: [field("locator", "Locator", locator)],
    actions: [primary("import", "Import")],
  };
}

/**
 * Answers `import` with an import of the locator the user entered and the subtitle
 * tracks named in the input's `subtitles` field, passing the whole input on.
 *
 * @param {string} action
 * @param {{ field: string, values: string[] }[]} input
 */
export function importStep(action, input) {
  expectAction(action, "import");
  const locator = valuesOf(input, "locator").join("");
  if (locator === "") {
    throw { tag: "invalid-input", val: "enter a locator" };
  }
  const subtitles = valuesOf(input, "subtitles");
  return { tag: "import", val: { locator, input, subtitles } };
}

/**
 * A form offering the English track unless it is held already, and the held tracks to
 * remove.
 *
 * @param {{ subtitles: { id: string, name: string }[] }} context
 */
export function mediaForm(context) {
  const isHeld = context.subtitles.some((held) => held.name === SUBTITLE_NAME);
  const offered = isHeld ? [] : [option(SUBTITLE_ID, SUBTITLE_NAME)];
  const held = context.subtitles.map((track) => option(track.id, track.name));
  return {
    title: "Subtitles from the fixture",
    description: undefined,
    fields: [
      field("fetch", "Fetch", chooseMany(offered)),
      field("remove", "Remove", chooseMany(held)),
    ],
    actions: [primary("apply", "Apply")],
  };
}

/**
 * Answers `apply` with the removals and the fetch the user chose.
 *
 * @param {{ locator: string }} context
 * @param {string} action
 * @param {{ field: string, values: string[] }[]} input
 */
export function mediaStep(context, action, input) {
  expectAction(action, "apply");
  const fetched = valuesOf(input, "fetch");
  const fetch =
    fetched.length > 0
      ? { locator: context.locator, input, subtitles: fetched }
      : undefined;
  return {
    tag: "apply",
    val: { removeSubtitles: valuesOf(input, "remove"), fetch },
  };
}

function expectAction(action, expected) {
  if (action !== expected) {
    throw { tag: "invalid-input", val: `no action ${JSON.stringify(action)}` };
  }
}

function field(id, label, control) {
  return { id, label, hint: undefined, control };
}

function chooseMany(options) {
  return { tag: "choose-many", val: { options, chosen: [] } };
}

function option(id, label) {
  return { id, label, hint: undefined };
}

function primary(id, label) {
  return { id, label, style: "primary" };
}
