import type { BrowserFileRegistry, PickedMediaFile } from "@easyimmerse/state";

/**
 * Builds the browser's picker for files the app keeps hold of, such as media and dictionary files.
 * The chosen `File` goes into the registry, and the result describes it the way the backend stores a `browser_file` source.
 */
export function createPickRegisteredFile(
  registry: BrowserFileRegistry<File>,
): (accept: readonly string[]) => Promise<PickedMediaFile | null> {
  return (accept) =>
    new Promise((resolve) => {
      const input = createHiddenFileInput(accept);
      input.addEventListener("change", () => {
        input.remove();
        resolve(registerPickedFile(registry, input.files?.[0]));
      });
      input.addEventListener("cancel", () => {
        input.remove();
        resolve(null);
      });
      document.body.append(input);
      input.click();
    });
}

function createHiddenFileInput(accept: readonly string[]): HTMLInputElement {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = accept.join(",");
  input.hidden = true;
  return input;
}

function registerPickedFile(
  registry: BrowserFileRegistry<File>,
  file: File | undefined,
): PickedMediaFile | null {
  if (file === undefined) return null;
  return { name: file.name, source: registry.register(file) };
}
