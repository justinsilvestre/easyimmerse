const tableExtensions = [".csv", ".tsv", ".tab", ".txt"];

/** Tells whether a file is a table whose columns the user checks before importing it. */
export function isTableFile(fileName: string): boolean {
  const lowerCase = fileName.toLowerCase();
  return tableExtensions.some((extension) => lowerCase.endsWith(extension));
}
