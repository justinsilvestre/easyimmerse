/**
 * The values the user entered in the field `field`, or none when the input lacks it.
 *
 * @param {{ field: string, values: string[] }[]} input
 * @param {string} field
 * @returns {string[]}
 */
export function valuesOf(input, field) {
  return input.find((entry) => entry.field === field)?.values ?? [];
}
