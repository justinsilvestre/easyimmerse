/**
 * Copies text to the clipboard.
 * Browsers offer the clipboard API only on secure origins, so on an insecure one, such as the web app served over a LAN address, this falls back to copying a selection.
 */
export async function copyTextToClipboard(text: string): Promise<void> {
  if (navigator.clipboard) return navigator.clipboard.writeText(text);
  copyBySelection(text);
}

function copyBySelection(text: string) {
  const textarea = createOffscreenTextarea(text);
  document.body.append(textarea);
  textarea.select();
  const isCopied = document.execCommand("copy");
  textarea.remove();
  if (!isCopied) throw new Error("The browser refused to copy the text.");
}

function createOffscreenTextarea(text: string) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  return textarea;
}
