import type { PickedDictionaryFile } from "@easyimmerse/state";

/** Opens the browser's file dialog for a dictionary archive and reads it. Resolves null when the user cancels. */
export function pickDictionaryFile(): Promise<PickedDictionaryFile | null> {
  const input = createHiddenFileInput();
  return new Promise((resolve) => {
    input.addEventListener("change", () => {
      input.remove();
      resolve(readPickedFile(input.files?.[0]));
    });
    input.addEventListener("cancel", () => {
      input.remove();
      resolve(null);
    });
    document.body.append(input);
    input.click();
  });
}

function createHiddenFileInput(): HTMLInputElement {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".zip";
  input.hidden = true;
  return input;
}

async function readPickedFile(
  file: File | undefined,
): Promise<PickedDictionaryFile | null> {
  if (file === undefined) return null;
  return {
    name: file.name,
    source: { kind: "bytes", bytes: new Uint8Array(await file.arrayBuffer()) },
  };
}
