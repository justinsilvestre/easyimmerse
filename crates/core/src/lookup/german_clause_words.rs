//! Small closed classes of German words that mark where a clause begins or ends,
//! which the search for separated particles uses in place of a part-of-speech tagger.

/// Coordinating conjunctions that join two clauses, or two phrases within one.
///
/// Source: grammis, Systematische Grammatik, unit 1281 „Konjunktoren", inventory (und, oder, aber, sondern, sowie);
/// STTS tag table, KON (und, oder, aber).
pub const COORDINATORS: &[&str] = &["und", "oder", "aber", "sondern", "sowie"];

/// Subordinating conjunctions that open a verb-final clause and are not spelled like a particle or a preposition.
///
/// Sources: STTS tag table, KOUS (weil, dass, wenn, ob); grammis, Systematische Grammatik, unit 1202
/// „Subjunktoren", inventory (obwohl, falls, sobald, solange, seitdem, indem, ehe).
pub const SUBJUNCTIONS: &[&str] = &[
    "dass", "weil", "ob", "wenn", "obwohl", "falls", "sobald", "solange", "seitdem", "indem", "ehe",
];

/// The relative pronouns, which open a verb-final relative clause after a comma.
///
/// Sources: grammis, Terminologie, unit 1890 „Relativ-Pronomen" (der, die, das; welch-; was, wer);
/// grammis, Kontrastive Grammatik, unit 3673, the forms of der, die, das (den, dem, dessen, derer, denen);
/// the endings of welch- as declined by the determiner rules of the deinflector.
#[rustfmt::skip]
pub const RELATIVE_PRONOUNS: &[&str] = &[
    "der", "die", "das", "den", "dem", "dessen", "derer", "denen",
    "welcher", "welche", "welches", "welchem", "welchen",
];

/// Interrogative words, which open a verb-final clause after a comma.
///
/// Sources: STTS tag table, PWS (wer, was), PWAT (wessen), PWAV (warum, wo, wann, worüber, wobei);
/// grammis, Kontrastive Grammatik, unit 3849 „Relativ-Elemente" (wen, wem, wofür, womit, worin, wie).
#[rustfmt::skip]
pub const W_WORDS: &[&str] = &[
    "wer", "wen", "wem", "wessen", "was", "warum", "wo", "wann", "wie", "worüber", "wobei", "wofür", "womit", "worin",
];

/// Prepositions that may stand before a relative pronoun at the start of a relative clause, as in „…, mit dem …".
///
/// Sources: Amtliches Regelwerk (2024), § 34 (1.1), p. 57, the particles spelled like prepositions;
/// STTS tag table, APPR (in, ohne).
#[rustfmt::skip]
pub const PREPOSITIONS: &[&str] = &[
    "ab", "an", "auf", "aus", "bei", "durch", "entgegen", "entlang", "gegen", "gegenüber", "hinter", "in", "mit",
    "nach", "ohne", "über", "um", "unter", "vor", "wider", "zu", "zwischen",
];

/// Comparison particles, which may follow the right sentence bracket, as in „Er sieht älter aus als sein Bruder".
///
/// Sources: STTS tag table, KOKOM (als, wie); grammis, „Nachfeld" (https://grammis.ids-mannheim.de/vggf/2288),
/// which places comparisons with als and wie after the right bracket.
pub const COMPARISON_PARTICLES: &[&str] = &["als", "wie"];

/// Prefixes that never separate from their verb, so that the pronoun er never stands for a particle.
///
/// Source: Gesellschaft für deutsche Sprache, „Trennbare und nicht trennbare Verben"
/// (https://gfds.de/trennbare-und-nicht-trennbare-verben/).
pub const NEVER_SEPARATED_PREFIXES: &[&str] =
    &["be", "emp", "ent", "er", "ge", "miss", "ver", "zer"];

/// Adverbs of two particles joined by und or wie, whose particles are not verb particles.
///
/// Source: Volk, Clematide, Graën and Ströbel (2016), „Bi-particle Adverbs, PoS-Tagging and the Recognition of
/// German Separable Prefix Verbs", KONVENS 2016, Table 1 and the further candidates named below it, p. 301.
pub const BI_PARTICLE_ADVERBS: &[&[&str]] = &[
    &["ab", "und", "an"],
    &["ab", "und", "zu"],
    &["auf", "und", "ab"],
    &["auf", "und", "davon"],
    &["durch", "und", "durch"],
    &["hin", "und", "wieder"],
    &["nach", "und", "nach"],
    &["nach", "wie", "vor"],
    &["aus", "und", "vorbei"],
    &["über", "und", "über"],
];

/// Base verbs that never form a particle verb written as one word, because combinations with sein are written apart.
///
/// Source: Amtliches Regelwerk (2024), § 35, p. 59.
pub const UNSEPARABLE_BASES: &[&str] = &["sein"];
