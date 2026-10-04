const glyph = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path d="M8 1 2 7h12zM4 9h8v6H4zm2 2v2h4v-2z" fill="black"/></svg>`;

const bowl = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 80"><rect width="120" height="80" fill="#fdf6e3"/><path d="M20 40h80a40 30 0 0 1-80 0z" fill="#c0392b"/><path d="M30 38q30-14 60 0" fill="#fafafa"/><path d="m70 6 30 30M78 4l28 28" stroke="#8d6e63" stroke-width="3"/></svg>`;

const flower = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><circle cx="20" cy="12" r="7" fill="#f48fb1"/><circle cx="12" cy="20" r="7" fill="#f48fb1"/><circle cx="28" cy="20" r="7" fill="#f48fb1"/><circle cx="20" cy="28" r="7" fill="#f48fb1"/><circle cx="20" cy="20" r="5" fill="#fdd835"/></svg>`;

const apple = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><circle cx="20" cy="23" r="14" fill="#e53935"/><path d="M20 10q2-6 8-7" stroke="#5d4037" stroke-width="2" fill="none"/></svg>`;

const examplePictures: Readonly<Record<string, string>> = {
  "jitendex/glyphs/taberu.svg": glyph,
  "jitendex/graphics/taberu.svg": bowl,
  "res/flower.png": flower,
  "images/apple.png": apple,
};

/** Resolves the example dictionaries' image paths to small inline pictures. */
export function resolveExampleMediaUrl(
  _dictionaryId: string,
  path: string,
): string | null {
  const svg = examplePictures[path];
  return svg ? `data:image/svg+xml,${encodeURIComponent(svg)}` : null;
}
