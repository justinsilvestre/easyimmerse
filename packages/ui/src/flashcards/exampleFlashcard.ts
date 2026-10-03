import type { FlashcardContent } from "./flashcardFields.ts";

/** A still frame drawn as an SVG, so previews can show a screenshot without a media file. */
export const exampleScreenshotUrl = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180">
    <defs>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#1e293b"/><stop offset="1" stop-color="#475569"/>
      </linearGradient>
    </defs>
    <rect width="320" height="180" fill="url(#sky)"/>
    <circle cx="250" cy="50" r="18" fill="#fde68a" opacity="0.9"/>
    <rect y="120" width="320" height="60" fill="#0f172a"/>
    <ellipse cx="110" cy="128" rx="46" ry="22" fill="#1e293b"/>
    <rect x="86" y="96" width="48" height="36" rx="6" fill="#334155"/>
  </svg>`,
)}`;

/** A flashcard made from the sample subtitles, shown wherever a preview needs realistic content. */
export const exampleFlashcard: FlashcardContent = {
  word: "fressen",
  wordPronunciation: "[ˈfʁɛsn̩]",
  l1Definition: "to eat (of an animal); to devour",
  l2Definition: "(von Tieren) Nahrung zu sich nehmen",
  textContext: "Der Hund will fressen. Er hat Hunger.",
  textContextTranslation: "The dog wants to eat. It is hungry.",
  textContextPronunciation: "[deːɐ̯ hʊnt vɪl ˈfʁɛsn̩ ‖ eːɐ̯ hat ˈhʊŋɐ]",
  audioContext: { startMs: 1750, endMs: 3000 },
  screenshot: exampleScreenshotUrl,
  tags: ["sample", "dark-s01e01"],
};
