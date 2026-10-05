//! The names of the inflections that the German rules undo.
//!
//! Finite verb forms are named by tense or mood, then by the persons and numbers that the form can stand for,
//! such as `present 3sg/2pl`. Every other name is a single category, such as `plural` or `declined`.

pub const PRESENT_1SG: &str = "present 1sg";
pub const PRESENT_2SG: &str = "present 2sg";
pub const PRESENT_3SG: &str = "present 3sg";
pub const PRESENT_1SG_3SG: &str = "present 1sg/3sg";
pub const PRESENT_3SG_2PL: &str = "present 3sg/2pl";
pub const PRESENT_1PL_3PL: &str = "present 1pl/3pl";
pub const PRESENT_2PL: &str = "present 2pl";

pub const PAST_1SG_3SG: &str = "past 1sg/3sg";
pub const PAST_2SG: &str = "past 2sg";
pub const PAST_1PL_3PL: &str = "past 1pl/3pl";
pub const PAST_2PL: &str = "past 2pl";

pub const SUBJUNCTIVE_I_1SG_3SG: &str = "subjunctive I 1sg/3sg";
pub const SUBJUNCTIVE_I_2SG: &str = "subjunctive I 2sg";
pub const SUBJUNCTIVE_I_1PL_3PL: &str = "subjunctive I 1pl/3pl";
pub const SUBJUNCTIVE_I_2PL: &str = "subjunctive I 2pl";

pub const SUBJUNCTIVE_II_1SG_3SG: &str = "subjunctive II 1sg/3sg";
pub const SUBJUNCTIVE_II_2SG: &str = "subjunctive II 2sg";
pub const SUBJUNCTIVE_II_1PL_3PL: &str = "subjunctive II 1pl/3pl";
pub const SUBJUNCTIVE_II_2PL: &str = "subjunctive II 2pl";

pub const IMPERATIVE_SG: &str = "imperative sg";
pub const IMPERATIVE_PL: &str = "imperative pl";

pub const PAST_PARTICIPLE: &str = "past participle";
pub const PRESENT_PARTICIPLE: &str = "present participle";
pub const ZU_INFINITIVE: &str = "zu-infinitive";

pub const PLURAL: &str = "plural";
pub const GENITIVE: &str = "genitive";
pub const DATIVE: &str = "dative";
/// The ending of weak nouns, such as Mensch-en, that marks any singular form other than the nominative.
pub const OBLIQUE: &str = "oblique";

/// An adjective or determiner ending, which marks case, number and gender together.
pub const DECLINED: &str = "declined";
pub const COMPARATIVE: &str = "comparative";
pub const SUPERLATIVE: &str = "superlative";

/// The names of the finite verb forms: those that agree with a subject in person and number, and the imperative.
pub const FINITE: [&str; 21] = [
    PRESENT_1SG,
    PRESENT_2SG,
    PRESENT_3SG,
    PRESENT_1SG_3SG,
    PRESENT_3SG_2PL,
    PRESENT_1PL_3PL,
    PRESENT_2PL,
    PAST_1SG_3SG,
    PAST_2SG,
    PAST_1PL_3PL,
    PAST_2PL,
    SUBJUNCTIVE_I_1SG_3SG,
    SUBJUNCTIVE_I_2SG,
    SUBJUNCTIVE_I_1PL_3PL,
    SUBJUNCTIVE_I_2PL,
    SUBJUNCTIVE_II_1SG_3SG,
    SUBJUNCTIVE_II_2SG,
    SUBJUNCTIVE_II_1PL_3PL,
    SUBJUNCTIVE_II_2PL,
    IMPERATIVE_SG,
    IMPERATIVE_PL,
];
