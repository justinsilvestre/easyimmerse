import type { Effects, PickedFile } from "@easyimmerse/state";
import type { BrowserFileStore } from "./browserFileStore.ts";

/**
 * Builds the effect that opens the browser's file dialog through a hidden input.
 * The chosen file is kept in the store and stands in as a browser_file source.
 * Resolves null when the user cancels, and rejects when the store cannot keep the file.
 */
export function createPickFile(store: BrowserFileStore): Effects["pickFile"] {
  return (_purpose, accept) => {
    const input = createHiddenFileInput(accept);
    return new Promise((resolve) => {
      input.addEventListener("change", () => {
        input.remove();
        const file = input.files?.[0];
        resolve(file === undefined ? null : storePickedFile(store, file));
      });
      input.addEventListener("cancel", () => {
        input.remove();
        resolve(null);
      });
      document.body.append(input);
      input.click();
    });
  };
}

function createHiddenFileInput(accept: readonly string[]): HTMLInputElement {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = accept.join(",");
  input.hidden = true;
  return input;
}

async function storePickedFile(
  store: BrowserFileStore,
  file: File,
): Promise<PickedFile> {
  const key = await store.put(file);
  return { name: file.name, source: { kind: "browser_file", key } };
}
