//! The first parts that separable verbs write together with the verb in infinitives, participles and verb-final clauses.

/// Every list of first parts.
pub const ALL: [&[&str]; 4] = [
    REGELWERK_PARTICLES,
    WORD_LIST_FIRST_PARTS,
    NOUN_FIRST_PARTS,
    COLLOQUIAL_PARTICLES,
];

/// The verb particles that the rules of the Amtliches Regelwerk list.
///
/// Source: Amtliches Regelwerk der deutschen Rechtschreibung (2024), § 34 (1.1), (1.2) with E2, and (1.3) with E4, pp. 56–58.
#[rustfmt::skip]
pub const REGELWERK_PARTICLES: &[&str] = &[
    "ab", "an", "auf", "aus", "bei", "durch", "ein", "entgegen", "entlang", "gegen", "gegenüber", "hinter", "in",
    "mit", "nach", "über", "um", "unter", "vor", "wider", "zu", "zuwider", "zwischen",
    "abwärts", "auseinander", "beisammen", "davon", "davor", "dazu", "dazwischen", "empor", "fort", "her", "heraus",
    "herbei", "herein", "hin", "hinaus", "hindurch", "hinein", "hintenüber", "hinterher", "hinüber", "nebenher",
    "nieder", "rückwärts", "umher", "voran", "voraus", "vorbei", "vorher", "vorweg", "weg", "weiter", "wieder",
    "zurück", "zusammen", "zuvor", "dran", "drauf", "drauflos",
    "abhanden", "anheim", "bevor", "dar", "einher", "entzwei", "fürlieb", "hintan", "inne", "überein", "überhand",
    "umhin", "vorlieb", "zurecht", "fehl", "feil", "heim", "irre", "kund", "preis", "wahr", "weis", "wett",
];

/// Further particles, adverbs and adjectives that the official word list writes together with a verb by § 34
/// (1.2), (1.3), (2.1) or (2.2), such as losbinden, hochbekommen, festkleben, freihalten, kaputtgehen and vollfüllen.
/// The rules of § 34 give their examples as open lists; the word list names these first parts one by one.
///
/// Source: Amtliches Regelwerk der deutschen Rechtschreibung (2024), Wörterverzeichnis, pp. 165–343,
/// at the entry for each first part. `docs/german-deinflection-sources.md` gives the page of each.
#[rustfmt::skip]
pub const WORD_LIST_FIRST_PARTS: &[&str] = &[
    "abseits", "aneinander", "aufeinander", "aufwärts", "auswärts", "beieinander", "beiseite", "da", "dabei",
    "dagegen", "daheim", "daher", "dahin", "dahinter", "daneben", "dort", "durcheinander", "einwärts",
    "gegeneinander", "herab", "heran", "herauf", "hernieder", "herum", "herunter", "hervor", "herzu", "herüber",
    "hier", "hinab", "hinan", "hinauf", "hintereinander", "hinunter", "hinweg", "hinzu", "hoch", "hops",
    "ineinander", "los", "nebeneinander", "quer", "rück", "seitwärts", "umeinander", "untereinander",
    "voneinander", "vornüber", "vorwärts", "vorüber", "übereinander", "zugute", "zunichte",
    "allein", "arm", "bankrott", "bereit", "blank", "blau", "blind", "bloß", "brach", "breit", "bunt", "dicht",
    "dunkel", "einig", "falsch", "fein", "fern", "fertig", "fest", "flach", "flüssig", "frei", "frisch", "gar",
    "geheim", "gerade", "gesund", "glatt", "gleich", "grob", "groß", "gut", "hart", "heilig", "heiß", "hell",
    "höher", "kahl", "kalt", "kaputt", "kirre", "klar", "klein", "knapp", "krank", "krumm", "kühl", "kurz",
    "lahm", "lang", "leck", "leer", "leicht", "locker", "madig", "matt", "nahe", "näher", "nass", "niedrig",
    "offen", "plan", "platt", "pleite", "rein", "richtig", "ruhig", "rund", "satt", "sauber", "scharf", "scheu",
    "schief", "schlank", "schlapp", "schlau", "schlecht", "schwach", "schwarz", "schwer", "schön", "selig",
    "sicher", "spitz", "stark", "steif", "still", "straff", "stramm", "tief", "tot", "trocken", "voll", "wach",
    "warm", "weich", "weiß", "wert", "wohl", "wund", "zufrieden", "ähnlich", "übel",
];

/// The nouns that have lost the properties of independent nouns and are written together with the verb
/// (eislaufen, kopfstehen, leidtun, nottun, standhalten, stattfinden, teilnehmen, wundernehmen). This list is closed.
///
/// Source: Amtliches Regelwerk der deutschen Rechtschreibung (2024), § 34 (3), p. 58.
pub const NOUN_FIRST_PARTS: &[&str] = &[
    "eis", "kopf", "leid", "not", "stand", "statt", "teil", "wunder",
];

/// Colloquial short forms of the particles heran, heraus and hinaus, herum, herunter and hinunter,
/// herauf and hinauf, and herüber and hinüber (rauskommen, rumlaufen).
/// Rein, the short form of herein and hinein, is in the word list already.
///
/// Sources: Schäfer (2018), p. 511, example (27c) (rauskommst); Duden online, the adverbs ran, raus, rum, runter,
/// rauf and rüber, each marked „umgangssprachlich" (<https://www.duden.de/rechtschreibung/raus>, read 2026-10-05).
pub const COLLOQUIAL_PARTICLES: &[&str] = &["ran", "raus", "rum", "runter", "rauf", "rüber"];
