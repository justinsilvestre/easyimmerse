const units = ["B", "kB", "MB", "GB", "TB"] as const;

/** Formats a byte count in 1000-byte units, with one decimal below ten of a unit: 1500 becomes `1.5 kB` and 5e9 becomes `5 GB`. */
export function formatByteSize(bytes: number): string {
  let value = Math.max(0, bytes);
  let unitIndex = 0;
  while (value >= 1000 && unitIndex < units.length - 1) {
    value /= 1000;
    unitIndex += 1;
  }
  const decimals = unitIndex > 0 && value < 10 ? 1 : 0;
  return `${Number(value.toFixed(decimals))} ${units[unitIndex]}`;
}
