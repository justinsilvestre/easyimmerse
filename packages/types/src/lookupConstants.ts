// Generated from the Rust constants by `crates/api/src/typescript_constants.rs`. Do not edit.

/** The most texts one batch lookup may hold. */
export const maxBatchTexts = 100;

/** The most characters (Unicode scalar values) one text of a batch lookup may hold. */
export const maxBatchTextCharacters = 2000;

/**
 * Kanji or Chinese characters, kana, the marks written among them, and Bopomofo, which are written without spaces between words.
 * The ranges are written for the inside of a character class of a regular expression with the `u` flag.
 */
export const chineseAndJapaneseCharacterRanges = String.raw`\u{3400}-\u{4DBF}\u{4E00}-\u{9FFF}\u{F900}-\u{FAFF}\u{20000}-\u{3134F}\u{31350}-\u{323AF}\u{3005}-\u{3007}\u{3031}-\u{3035}\u{303B}-\u{303C}\u{3040}-\u{30FF}\u{3105}-\u{312F}\u{31A0}-\u{31BF}\u{31F0}-\u{31FF}\u{FF66}-\u{FF9F}\u{1AFF0}-\u{1AFFF}\u{1B000}-\u{1B16F}`;

/**
 * The characters of the South East Asian scripts written without spaces between words, such as Thai, Lao, Myanmar and Khmer: those of Line_Break class SA.
 * The ranges are written for the inside of a character class of a regular expression with the `u` flag.
 */
export const southEastAsianCharacterRanges = String.raw`\u{E01}-\u{E3A}\u{E40}-\u{E4E}\u{E81}-\u{E82}\u{E84}\u{E86}-\u{E8A}\u{E8C}-\u{EA3}\u{EA5}\u{EA7}-\u{EBD}\u{EC0}-\u{EC4}\u{EC6}\u{EC8}-\u{ECE}\u{EDC}-\u{EDF}\u{1000}-\u{103F}\u{1050}-\u{108F}\u{109A}-\u{109F}\u{1780}-\u{17D3}\u{17D7}\u{17DC}-\u{17DD}\u{1950}-\u{196D}\u{1970}-\u{1974}\u{1980}-\u{19AB}\u{19B0}-\u{19C9}\u{19DE}-\u{19DF}\u{1A20}-\u{1A5E}\u{1A60}-\u{1A7C}\u{1AA0}-\u{1AAD}\u{A9E0}-\u{A9EF}\u{A9FA}-\u{A9FE}\u{AA60}-\u{AAC2}\u{AADB}-\u{AADF}\u{11700}-\u{1171A}\u{1171D}-\u{1172B}\u{1173A}-\u{1173B}\u{1173F}-\u{11746}`;

/**
 * The combining marks of the South East Asian scripts, such as Thai vowel signs and tone marks, which belong to the letter before them.
 * The ranges are written for the inside of a character class of a regular expression with the `u` flag.
 */
export const southEastAsianMarkRanges = String.raw`\u{E31}\u{E34}-\u{E3A}\u{E47}-\u{E4E}\u{EB1}\u{EB4}-\u{EBC}\u{EC8}-\u{ECE}\u{102B}-\u{103E}\u{1056}-\u{1059}\u{105E}-\u{1060}\u{1062}-\u{1064}\u{1067}-\u{106D}\u{1071}-\u{1074}\u{1082}-\u{108D}\u{108F}\u{109A}-\u{109D}\u{17B4}-\u{17D3}\u{17DD}\u{1A55}-\u{1A5E}\u{1A60}-\u{1A7C}\u{A9E5}\u{AA7B}-\u{AA7D}\u{AAB0}\u{AAB2}-\u{AAB4}\u{AAB7}-\u{AAB8}\u{AABE}-\u{AABF}\u{AAC1}\u{1171D}-\u{1172B}`;
