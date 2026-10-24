const STEP_SEPARATOR = " ‹ ";

/**
 * Writes the equally good inflection chains of a lookup result, each given outermost first, as lines read from the dictionary form outwards.
 * Chains that differ in only one step share a line, with the alternatives for that step joined by "or".
 */
export function formatInflectionChains(
  chains: readonly (readonly string[])[],
): string[] {
  const outwards = chains.map((chain) => chain.toReversed());
  const step = soleDifferingStep(outwards);
  if (step === null) {
    return outwards.map((chain) => chain.join(STEP_SEPARATOR));
  }
  return [joinAlternatives(outwards, step).join(STEP_SEPARATOR)];
}

/** The one position at which chains of equal length differ, or null if there are fewer than two or they differ elsewhere too. */
function soleDifferingStep(chains: readonly string[][]): number | null {
  const [first, ...rest] = chains;
  if (!first || rest.length === 0) return null;
  if (rest.some((chain) => chain.length !== first.length)) return null;
  const differing = first
    .map((_, step) => step)
    .filter((step) => rest.some((chain) => chain[step] !== first[step]));
  return differing.length === 1 ? (differing[0] ?? null) : null;
}

function joinAlternatives(chains: readonly string[][], step: number): string[] {
  const [first = []] = chains;
  const alternatives = chains.map((chain) => chain[step]);
  return first.with(step, alternatives.join(" or "));
}
