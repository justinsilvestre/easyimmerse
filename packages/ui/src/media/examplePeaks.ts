/** Makes a waveform that looks like speech, the same every time, for stories and previews. */
export function generateExamplePeaks(count: number, seed = 7): number[] {
  let state = seed;
  const random = () => {
    state = (state * 1_103_515_245 + 12_345) % 2_147_483_648;
    return state / 2_147_483_648;
  };
  return Array.from({ length: count }, (_, index) => {
    const burst = Math.max(0, Math.sin(index / 9) * Math.sin(index / 23 + 1));
    return Math.min(1, 0.04 + burst * (0.35 + random() * 0.6));
  });
}
