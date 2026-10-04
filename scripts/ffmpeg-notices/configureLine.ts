const configurationMarker = "configuration: --";
const prefixOption = "--prefix=";

/**
 * Finds the configure line that ffmpeg embeds in its binaries (printed by `ffmpeg -version`
 * after `configuration: `). Without that marker, the longest printable string containing
 * `--prefix=` is taken from its first `--`, since statically linked libraries may embed
 * configure lines of their own.
 */
export function findConfigureLine(binary: Uint8Array): string | null {
  const bytes = Buffer.from(
    binary.buffer,
    binary.byteOffset,
    binary.byteLength,
  );
  return (
    findLongest(bytes, configurationMarker, printableStringAfterMarker) ??
    findLongest(bytes, prefixOption, printableStringAround)
  );
}

function findLongest(
  bytes: Buffer,
  marker: string,
  extract: (bytes: Buffer, index: number) => string,
): string | null {
  let longest: string | null = null;
  let from = bytes.indexOf(marker);
  while (from !== -1) {
    const candidate = extract(bytes, from);
    if (!longest || candidate.length > longest.length) longest = candidate;
    from = bytes.indexOf(marker, from + marker.length);
  }
  return longest;
}

function printableStringAfterMarker(bytes: Buffer, index: number): string {
  const start = index + configurationMarker.indexOf("--");
  return bytes.toString("latin1", start, printableEnd(bytes, start));
}

function printableStringAround(bytes: Buffer, index: number): string {
  let start = index;
  while (start > 0 && isPrintable(bytes[start - 1] ?? 0)) start--;
  const text = bytes.toString("latin1", start, printableEnd(bytes, index));
  return text.slice(text.indexOf("--"));
}

function printableEnd(bytes: Buffer, index: number): number {
  let end = index;
  while (end < bytes.length && isPrintable(bytes[end] ?? 0)) end++;
  return end;
}

function isPrintable(byte: number): boolean {
  return byte >= 0x20 && byte <= 0x7e;
}

/** Splits a configure line into arguments, honoring the single quotes configure adds. */
export function parseConfigureLine(line: string): string[] {
  const args: string[] = [];
  let current = "";
  let quoted = false;
  for (const char of line) {
    if (char === "'") quoted = !quoted;
    else if (/\s/.test(char) && !quoted) {
      if (current) args.push(current);
      current = "";
    } else current += char;
  }
  if (current) args.push(current);
  return args;
}

/**
 * Lists the features a configure line leaves enabled, in the vocabulary of the library
 * table: `--enable-<name>` gives `<name>` unless a later `--disable-<name>` revokes it,
 * `-l<name>` in `--extra-libs` gives `lib:<name>`, and `--target-os=<os>` gives
 * `target-os:<os>`.
 */
export function listEnabledFeatures(args: string[]): string[] {
  const enabled = new Set<string>();
  for (const arg of args) {
    const toggle = /^--(enable|disable)-(.+)$/.exec(arg);
    if (toggle?.[1] === "enable") enabled.add(toggle[2] ?? "");
    else if (toggle) enabled.delete(toggle[2] ?? "");
    for (const feature of featuresOfOption(arg)) enabled.add(feature);
  }
  return [...enabled].sort();
}

function featuresOfOption(arg: string): string[] {
  const [option, value = ""] = arg.split(/=(.*)/s);
  if (option === "--target-os") return [`target-os:${value}`];
  if (option !== "--extra-libs") return [];
  return value
    .split(/\s+/)
    .filter((token) => token.startsWith("-l"))
    .map((token) => `lib:${token.slice(2)}`);
}
