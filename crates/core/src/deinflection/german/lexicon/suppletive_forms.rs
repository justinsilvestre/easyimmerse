//! Single verb forms that neither the rules nor the irregular verb table derive.

use crate::deinflection::german::inflection::*;

/// A form, the infinitive it belongs to, and the inflections it may stand for.
pub(super) type SuppletiveForm = (&'static str, &'static str, &'static [&'static str]);

/// The present of the modal verbs and wissen uses a singular stem with the past endings (ich kann, du kannst).
/// Sein, haben and werden have suppletive present forms. Their plural and other regular forms come from the rules.
///
/// Sources: Schäfer (2018), Tab. 10.17, p. 311, and Tab. 10.20, p. 314;
/// grammis, Propädeutische Grammatik, units 4075 (modal verbs and wissen) and 4076 (sein, haben, werden).
pub(super) const MODAL_AND_AUXILIARY_PRESENT: [SuppletiveForm; 22] = [
    ("darf", "dürfen", &[PRESENT_1SG_3SG]),
    ("darfst", "dürfen", &[PRESENT_2SG]),
    ("kann", "können", &[PRESENT_1SG_3SG]),
    ("kannst", "können", &[PRESENT_2SG]),
    ("mag", "mögen", &[PRESENT_1SG_3SG]),
    ("magst", "mögen", &[PRESENT_2SG]),
    ("muss", "müssen", &[PRESENT_1SG_3SG]),
    ("musst", "müssen", &[PRESENT_2SG]),
    ("soll", "sollen", &[PRESENT_1SG_3SG]),
    ("sollst", "sollen", &[PRESENT_2SG]),
    ("will", "wollen", &[PRESENT_1SG_3SG]),
    ("willst", "wollen", &[PRESENT_2SG]),
    ("weiß", "wissen", &[PRESENT_1SG_3SG]),
    ("weißt", "wissen", &[PRESENT_2SG]),
    ("bin", "sein", &[PRESENT_1SG]),
    ("bist", "sein", &[PRESENT_2SG]),
    ("ist", "sein", &[PRESENT_3SG]),
    ("sind", "sein", &[PRESENT_1PL_3PL]),
    ("seid", "sein", &[PRESENT_2PL, IMPERATIVE_PL]),
    ("sei", "sein", &[SUBJUNCTIVE_I_1SG_3SG]),
    ("hast", "haben", &[PRESENT_2SG]),
    ("hat", "haben", &[PRESENT_3SG]),
];

/// The subjunctive I of sein, whose stem sei- takes the endings directly or after a schwa.
///
/// Source: Schäfer (2018), Tab. 10.20, p. 314.
pub(super) const SEIN_SUBJUNCTIVE: [SuppletiveForm; 5] = [
    ("seist", "sein", &[SUBJUNCTIVE_I_2SG]),
    ("seiest", "sein", &[SUBJUNCTIVE_I_2SG]),
    ("seien", "sein", &[SUBJUNCTIVE_I_1PL_3PL]),
    ("seiet", "sein", &[SUBJUNCTIVE_I_2PL]),
    ("seit", "sein", &[SUBJUNCTIVE_I_2PL]),
];

/// Tun and sein end in -n rather than -en, so the regular rules cannot restore their infinitive.
///
/// Sources: Wikidata lexemes L302572 (tun) and L1761 (sein), CC0.
pub(super) const N_INFINITIVE_FORMS: [SuppletiveForm; 9] = [
    ("tue", "tun", &[PRESENT_1SG, SUBJUNCTIVE_I_1SG_3SG]),
    ("tust", "tun", &[PRESENT_2SG]),
    ("tut", "tun", &[PRESENT_3SG_2PL, IMPERATIVE_PL]),
    ("tu", "tun", &[IMPERATIVE_SG]),
    ("tuest", "tun", &[SUBJUNCTIVE_I_2SG]),
    ("tuen", "tun", &[SUBJUNCTIVE_I_1PL_3PL]),
    ("tuet", "tun", &[SUBJUNCTIVE_I_2PL]),
    ("tuend", "tun", &[PRESENT_PARTICIPLE]),
    ("seiend", "sein", &[PRESENT_PARTICIPLE]),
];
