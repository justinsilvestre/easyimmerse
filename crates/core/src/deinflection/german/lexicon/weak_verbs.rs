//! Weak verbs that share their shape with a strong verb of the lexicon, whose regular forms must stay possible.

/// Verbs with both strong (or mixed) and weak forms.
///
/// Sources: grammis, Propädeutische Grammatik, unit 4074, the two tables of verbs with strong and weak forms
/// (erschallen as formed from schallen); dingen from Wikidata lexeme L883783 (abdingen: dingte, abgedingt), CC0.
#[rustfmt::skip]
pub(super) const VERBS_WITH_WEAK_FORMS: [&str; 46] = [
    "dingen",
    "dünken", "erkiesen", "fragen", "gleiten", "glimmen", "hauen", "klimmen", "kreischen", "küren", "löschen",
    "mahlen", "melken", "salzen", "saugen", "schallen", "erschallen", "schinden", "schleißen", "schmeißen",
    "schnauben", "sieden", "spalten", "stieben", "triefen", "wägen", "winken", "backen", "bewegen", "bleichen",
    "erschrecken", "gären", "hängen", "pflegen", "quellen", "schaffen", "scheren", "schleifen", "schmelzen",
    "schwellen", "senden", "stecken", "weben", "weichen", "wenden", "wiegen",
];

/// Weak verbs spelled like a strong verb of the lexicon but with another meaning: wachsen "to wax" (wachste, gewachst)
/// beside wachsen "to grow" (wuchs, gewachsen).
///
/// Sources: Duden online, the weak verb wachsen (<https://www.duden.de/rechtschreibung/wachsen_gewachst>, read
/// 2026-10-05); Wikidata lexeme L594187 (wachste, gewachst), CC0.
pub(super) const WEAK_HOMONYMS: [&str; 1] = ["wachsen"];

/// Weak verbs that look like an inseparable prefix or a particle followed by a strong verb (be-reiten, um-ringen,
/// ein-preisen), but conjugate weakly (bereitete, umringte, preiste ein).
///
/// Source: the Wikidata lexemes (CC0) named after each verb, which give its weak past. Every verb in the Wikidata
/// dump of 2026-09-30 that has this shape and a weak past is listed, except erbitten, whose weak past erbittete is
/// an error: Duden online gives erbat (<https://www.duden.de/rechtschreibung/erbitten>, read 2026-10-05).
/// The weak begleiten (L486051) is listed as well, although its gleiten keeps its weak forms anyway.
#[rustfmt::skip]
pub(super) const WEAK_LOOKALIKES: [&str; 12] = [
    "begleiten",   // L486051
    "bekneifen",   // L752696
    "bereiten",    // L656275
    "beringen",    // L814855
    "umringen",    // L830568
    "verleiden",   // L881959
    "verspleißen", // L765176
    "aufheißen",   // L836613
    "auspreisen",  // L837103
    "einpreisen",  // L781761
    "einringen",   // L756513
    "bevorraten",  // L815962
];
