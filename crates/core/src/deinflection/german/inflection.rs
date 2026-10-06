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

/// The paradigms of finite verb forms.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Paradigm {
    Present,
    Past,
    SubjunctiveI,
    SubjunctiveII,
    Imperative,
}

/// A finite verb form's name, with its paradigm and the persons it may stand for.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct FiniteForm {
    pub name: &'static str,
    pub paradigm: Paradigm,
    pub persons: Persons,
}

/// A set of persons and numbers, one bit each: 1sg, 2sg, 3sg, 1pl, 2pl, 3pl.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Persons(u8);

impl Persons {
    pub const NONE: Self = Self(0);
    pub const SECOND_SINGULAR: Self = Self::SG2;
    pub const THIRD_SINGULAR: Self = Self::SG3;
    const SG1: Self = Self(1);
    const SG2: Self = Self(1 << 1);
    const SG3: Self = Self(1 << 2);
    const PL1: Self = Self(1 << 3);
    const PL2: Self = Self(1 << 4);
    const PL3: Self = Self(1 << 5);

    pub const fn or(self, other: Self) -> Self {
        Self(self.0 | other.0)
    }

    pub const fn without(self, other: Self) -> Self {
        Self(self.0 & !other.0)
    }
}

/// The finite verb forms: those that agree with a subject in person and number, and the imperative.
const FINITE_FORMS: [FiniteForm; 21] = {
    use Paradigm::*;
    const SG1_SG3: Persons = Persons::SG1.or(Persons::SG3);
    const SG3_PL2: Persons = Persons::SG3.or(Persons::PL2);
    const PL1_PL3: Persons = Persons::PL1.or(Persons::PL3);
    [
        form(PRESENT_1SG, Present, Persons::SG1),
        form(PRESENT_2SG, Present, Persons::SG2),
        form(PRESENT_3SG, Present, Persons::SG3),
        form(PRESENT_1SG_3SG, Present, SG1_SG3),
        form(PRESENT_3SG_2PL, Present, SG3_PL2),
        form(PRESENT_1PL_3PL, Present, PL1_PL3),
        form(PRESENT_2PL, Present, Persons::PL2),
        form(PAST_1SG_3SG, Past, SG1_SG3),
        form(PAST_2SG, Past, Persons::SG2),
        form(PAST_1PL_3PL, Past, PL1_PL3),
        form(PAST_2PL, Past, Persons::PL2),
        form(SUBJUNCTIVE_I_1SG_3SG, SubjunctiveI, SG1_SG3),
        form(SUBJUNCTIVE_I_2SG, SubjunctiveI, Persons::SG2),
        form(SUBJUNCTIVE_I_1PL_3PL, SubjunctiveI, PL1_PL3),
        form(SUBJUNCTIVE_I_2PL, SubjunctiveI, Persons::PL2),
        form(SUBJUNCTIVE_II_1SG_3SG, SubjunctiveII, SG1_SG3),
        form(SUBJUNCTIVE_II_2SG, SubjunctiveII, Persons::SG2),
        form(SUBJUNCTIVE_II_1PL_3PL, SubjunctiveII, PL1_PL3),
        form(SUBJUNCTIVE_II_2PL, SubjunctiveII, Persons::PL2),
        form(IMPERATIVE_SG, Imperative, Persons::SG2),
        form(IMPERATIVE_PL, Imperative, Persons::PL2),
    ]
};

const fn form(name: &'static str, paradigm: Paradigm, persons: Persons) -> FiniteForm {
    FiniteForm {
        name,
        paradigm,
        persons,
    }
}

/// The finite form named `name`, if it is one.
pub fn finite_form(name: &str) -> Option<FiniteForm> {
    FINITE_FORMS.into_iter().find(|form| form.name == name)
}

/// The name of the finite form of `paradigm` that stands for exactly `persons`, if there is one.
pub fn finite_name(paradigm: Paradigm, persons: Persons) -> Option<&'static str> {
    FINITE_FORMS
        .into_iter()
        .find(|form| form.paradigm == paradigm && form.persons == persons)
        .map(|form| form.name)
}
