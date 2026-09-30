import type { PickedFile } from "@easyimmerse/state";

/** Opens the browser's file dialog through a hidden input. Resolves null when the user cancels. */
export function pickFile(
  accept: readonly string[],
): Promise<PickedFile | null> {
  const input = createHiddenFileInput(accept);
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

function createHiddenFileInput(accept: readonly string[]): HTMLInputElement {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = accept.join(",");
  input.hidden = true;
  return input;
}

async function readPickedFile(
  file: File | undefined,
): Promise<PickedFile | null> {
  if (file === undefined) return null;
  return {
    name: file.name,
    source: { kind: "inline", text: await file.text() },
  };
}
