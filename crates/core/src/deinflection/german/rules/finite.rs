//! Regular finite verb endings: the present, the subjunctive I, the imperative, and the weak past and subjunctive II.

use crate::deinflection::german::inflection::*;
use crate::deinflection::german::rule::{Rule, Stem};
use crate::deinflection::german::word_class::WordClasses as C;

/// The present takes -e, -st, -t, -en, -t, -en; the subjunctive I adds -e before -st, -t and -n (lach-e-st);
/// the imperative is the bare stem or the stem with -e in the singular, and the stem with -t in the plural.
/// Stems ending in a dental, or in a plosive or fricative before a nasal, keep the schwa in every ending (redest, atmet).
/// After s, ß, x and z the 2nd person singular drops the s of -st (du reist, du sitzt).
/// Stems in -el and -er may drop their own schwa before an ending that starts with e (ich sammle, ich wandre, du reglest).
///
/// Sources: Schäfer (2018), Tab. 10.8, p. 303, Tab. 10.10, p. 305, Tab. 10.11, p. 306, and Tab. 10.16, p. 310;
/// grammis, Propädeutische Grammatik, unit 4119 (schwa in verb endings, and stems in -el and -er);
/// Amtliches Regelwerk (2024), § 26, p. 48 (du reist).
pub const PRESENT: &[Rule] = &[
    Rule::replace("e", "en").named(&[PRESENT_1SG, SUBJUNCTIVE_I_1SG_3SG, IMPERATIVE_SG]),
    Rule::replace("st", "en").named(&[PRESENT_2SG]),
    Rule::replace("est", "en").named(&[PRESENT_2SG, SUBJUNCTIVE_I_2SG]),
    Rule::replace("t", "en").named(&[PRESENT_3SG_2PL, IMPERATIVE_PL]),
    Rule::replace("t", "en")
        .stem(Stem::Sibilant)
        .named(&[PRESENT_2SG]),
    Rule::replace("et", "en").named(&[PRESENT_3SG_2PL, SUBJUNCTIVE_I_2PL, IMPERATIVE_PL]),
    Rule::replace("en", "en").named(&[PRESENT_1PL_3PL, SUBJUNCTIVE_I_1PL_3PL]),
    Rule::replace("n", "n")
        .stem(Stem::ElEr)
        .named(&[PRESENT_1PL_3PL, SUBJUNCTIVE_I_1PL_3PL]),
    Rule::replace("le", "eln").named(&[PRESENT_1SG, SUBJUNCTIVE_I_1SG_3SG, IMPERATIVE_SG]),
    Rule::replace("re", "ern").named(&[PRESENT_1SG, SUBJUNCTIVE_I_1SG_3SG, IMPERATIVE_SG]),
    Rule::replace("lest", "eln").named(&[SUBJUNCTIVE_I_2SG]),
    Rule::replace("let", "eln").named(&[SUBJUNCTIVE_I_2PL]),
    Rule::replace("rest", "ern").named(&[SUBJUNCTIVE_I_2SG]),
    Rule::replace("ret", "ern").named(&[SUBJUNCTIVE_I_2PL]),
    Rule::replace("", "en")
        .stem(Stem::NotE)
        .named(&[IMPERATIVE_SG]),
];

/// The weak past adds -te before the endings -∅, -st, -n, -t, -n, with a schwa after dentals (red-ete).
/// The weak subjunctive II has the same forms.
///
/// Sources: Schäfer (2018), Tab. 10.8, p. 303, and Tab. 10.11, p. 306; grammis, unit 4119 (bet-et-e).
pub const WEAK_PAST: &[Rule] = &[
    Rule::replace("te", "en").named(&[PAST_1SG_3SG, SUBJUNCTIVE_II_1SG_3SG]),
    Rule::replace("test", "en").named(&[PAST_2SG, SUBJUNCTIVE_II_2SG]),
    Rule::replace("ten", "en").named(&[PAST_1PL_3PL, SUBJUNCTIVE_II_1PL_3PL]),
    Rule::replace("tet", "en").named(&[PAST_2PL, SUBJUNCTIVE_II_2PL]),
    Rule::replace("ete", "en").named(&[PAST_1SG_3SG, SUBJUNCTIVE_II_1SG_3SG]),
    Rule::replace("etest", "en").named(&[PAST_2SG, SUBJUNCTIVE_II_2SG]),
    Rule::replace("eten", "en").named(&[PAST_1PL_3PL, SUBJUNCTIVE_II_1PL_3PL]),
    Rule::replace("etet", "en").named(&[PAST_2PL, SUBJUNCTIVE_II_2PL]),
];

/// Verbs whose stem ends in -el or -er take -n instead of -en in the infinitive (sammeln, not sammelen).
/// These rules turn the regular -en that other rules restore into -n, and undo no inflection of their own.
///
/// Source: grammis, unit 4119 (stems in -el and -er).
pub const EL_ER_INFINITIVE: &[Rule] = &[
    Rule::replace("elen", "eln").from(C::VERB).stem(Stem::Any),
    Rule::replace("eren", "ern").from(C::VERB).stem(Stem::Any),
];

#[cfg(test)]
mod tests {
    use crate::deinflection::german::test_support::yields;

    #[test]
    fn undoes_the_present_1st_person_singular() {
        assert!(yields("lache", "lachen", "v", &["present 1sg"]));
    }

    #[test]
    fn undoes_the_present_2nd_person_singular() {
        assert!(yields("lachst", "lachen", "v", &["present 2sg"]));
    }

    #[test]
    fn undoes_the_present_2nd_person_singular_with_schwa() {
        assert!(yields("arbeitest", "arbeiten", "v", &["present 2sg"]));
    }

    #[test]
    fn undoes_the_present_2nd_person_singular_after_a_sibilant() {
        assert!(yields("reist", "reisen", "v", &["present 2sg"]));
    }

    #[test]
    fn undoes_the_present_3rd_person_singular() {
        assert!(yields("lacht", "lachen", "v", &["present 3sg/2pl"]));
    }

    #[test]
    fn undoes_the_present_3rd_person_singular_with_schwa() {
        assert!(yields("redet", "reden", "v", &["present 3sg/2pl"]));
    }

    #[test]
    fn reads_the_infinitive_shape_as_a_finite_plural() {
        assert!(yields("kommen", "kommen", "v", &["present 1pl/3pl"]));
    }

    #[test]
    fn undoes_the_subjunctive_i() {
        assert!(yields("lachest", "lachen", "v", &["subjunctive I 2sg"]));
    }

    #[test]
    fn undoes_a_1st_person_singular_without_the_stem_schwa() {
        assert!(yields("sammle", "sammeln", "v", &["present 1sg"]));
    }

    #[test]
    fn undoes_a_3rd_person_singular_of_a_stem_in_el() {
        assert!(yields("sammelt", "sammeln", "v", &["present 3sg/2pl"]));
    }

    #[test]
    fn undoes_the_plural_of_a_stem_in_er() {
        assert!(yields("wandern", "wandern", "v", &["present 1pl/3pl"]));
    }

    #[test]
    fn undoes_the_bare_stem_imperative() {
        assert!(yields("lach", "lachen", "v", &["imperative sg"]));
    }

    #[test]
    fn undoes_the_weak_past() {
        assert!(yields("lachte", "lachen", "v", &["past 1sg/3sg"]));
    }

    #[test]
    fn undoes_the_weak_subjunctive_ii() {
        assert!(yields("lachtest", "lachen", "v", &["subjunctive II 2sg"]));
    }

    #[test]
    fn undoes_the_weak_past_with_schwa() {
        assert!(yields("redeten", "reden", "v", &["past 1pl/3pl"]));
    }

    #[test]
    fn undoes_the_weak_past_of_a_stem_in_er() {
        assert!(yields("wanderte", "wandern", "v", &["past 1sg/3sg"]));
    }
}
