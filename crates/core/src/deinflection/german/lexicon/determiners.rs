//! Articles and pronouns that decline with the endings -e, -en, -er, -es and -em.
//! Personal pronouns such as mir and ich are not deinflected, because dictionaries list each of their forms.

/// The indefinite and possessive articles, whose dictionary form is the bare stem (mein, kein), as is their nominative masculine.
/// The pronoun forms add -s in the neuter (keins). Unser and euer may drop the schwa of their stem (unsre, eure)
/// or of the ending -em and -en (unserm, euern).
///
/// Sources: Schäfer (2018), Tab. 9.7, p. 270, and Tab. 9.11, p. 275; grammis, Propädeutische Grammatik,
/// units 4062 (unser and euer) and 4063 (the list of indefinite and possessive articles).
pub(super) const BARE_STEMS: [(&str, &str); 11] = [
    ("ein", "ein"),
    ("irgendein", "irgendein"),
    ("kein", "kein"),
    ("mein", "mein"),
    ("dein", "dein"),
    ("sein", "sein"),
    ("ihr", "ihr"),
    ("unser", "unser"),
    ("unsr", "unser"),
    ("euer", "euer"),
    ("eur", "euer"),
];

/// The demonstratives, interrogatives and quantifiers whose dictionary form is the nominative masculine in -er (dieser, jeder).
///
/// Sources: Schäfer (2018), Tab. 9.8, p. 273 (dies-); grammis, unit 4063 (the articles that follow this pattern).
pub(super) const ER_STEMS: [(&str, &str); 8] = [
    ("dies", "dieser"),
    ("jen", "jener"),
    ("solch", "solcher"),
    ("welch", "welcher"),
    ("irgendwelch", "irgendwelcher"),
    ("jed", "jeder"),
    ("jedwed", "jedweder"),
    ("manch", "mancher"),
];

/// The endings that both kinds of stem take.
///
/// Sources: Schäfer (2018), Tab. 9.8, p. 273; grammis, unit 4063.
pub(super) const ENDINGS: [&str; 5] = ["e", "en", "er", "es", "em"];

/// The endings that only some stems take: -s on the bare-stem pronouns (keins),
/// and -m and -n on unser and euer (unserm, euern).
///
/// Sources: Schäfer (2018), Tab. 9.7, p. 270; grammis, unit 4062.
pub(super) const SHORT_ENDINGS: [(&str, &str); 9] = [
    ("ein", "s"),
    ("kein", "s"),
    ("mein", "s"),
    ("dein", "s"),
    ("sein", "s"),
    ("unser", "m"),
    ("unser", "n"),
    ("euer", "m"),
    ("euer", "n"),
];
