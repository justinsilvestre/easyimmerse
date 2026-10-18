/** How long the file's object URL outlives the click, since some browsers start reading it only after the click returns. */
const revokeDelayMs = 10_000;

/** Hands bytes to the user as a downloaded file, through a temporary object URL and a hidden link that is clicked. */
export function downloadFile(
  fileName: string,
  bytes: Uint8Array<ArrayBuffer>,
): void {
  const url = URL.createObjectURL(new Blob([bytes]));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), revokeDelayMs);
}
