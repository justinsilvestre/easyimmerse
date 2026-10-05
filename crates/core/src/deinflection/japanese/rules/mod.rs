//! The rule tables, one module per group of related inflections.

mod adjective;
mod classical;
mod colloquial;
mod continuative;
mod contractions;
mod godan_suru;
mod imperative;
mod negative;
mod perfective;
mod polite;
mod provisional;
mod stems;
mod voice;
mod volitional;

use super::rule::{Rule, Stem};
use super::word_class::WordClasses as C;

/// Every rule group. Where two chains reach the same term, the group listed first names the result.
pub const ALL: &[&[Rule]] = &[
    stems::BARE,
    stems::CONTINUATIVE,
    stems::IRREALIS,
    stems::ONBIN_TA,
    stems::ONBIN_DA,
    stems::U_ONBIN,
    adjective::ADJECTIVE_STEM,
    perfective::PERFECTIVE,
    negative::NEGATIVE,
    negative::WESTERN_NEGATIVE,
    negative::WESTERN_NEGATIVE_STEMS,
    polite::POLITE,
    volitional::VOLITIONAL,
    volitional::SHORT_VOLITIONAL,
    volitional::NEGATIVE_VOLITIONAL,
    imperative::IMPERATIVE,
    provisional::PROVISIONAL,
    provisional::FUSED_PROVISIONAL,
    voice::PASSIVE,
    voice::POTENTIAL,
    voice::CAUSATIVE,
    voice::SHORT_CAUSATIVE,
    continuative::CONTINUATIVE_AUXILIARIES,
    continuative::WESTERN_HONORIFIC,
    continuative::APPEARANCE,
    adjective::ADJECTIVE,
    adjective::ADJECTIVE_CONTINUATIVE_SUFFIXES,
    adjective::ADJECTIVE_CONTINUATIVE,
    contractions::PROGRESSIVE,
    contractions::PREPARATORY,
    contractions::CONTINUING,
    contractions::COMPLETIVE,
    contractions::BENEFACTIVE,
    contractions::HONORIFIC_PROGRESSIVE,
    godan_suru::GODAN_SURU,
    classical::CONJECTURE,
    classical::ATTRIBUTIVE,
    colloquial::CONTRACTED,
    colloquial::VOWEL_FUSION,
];

/// Gives every rule in `rules` the same accepted classes and undone inflections.
const fn sharing<const N: usize>(
    mut rules: [Rule; N],
    from: C,
    inflections: &'static [&'static str],
) -> [Rule; N] {
    let mut index = 0;
    while index < N {
        rules[index] = rules[index].from(from).named(inflections);
        index += 1;
    }
    rules
}

const fn godan(inflected: &'static str, base: &'static str) -> Rule {
    Rule::replace(inflected, base).to(C::V5)
}

const fn ichidan(inflected: &'static str, base: &'static str) -> Rule {
    Rule::replace(inflected, base).to(C::V1).stem(Stem::Ichidan)
}

const fn kuru(inflected: &'static str, base: &'static str) -> Rule {
    Rule::replace(inflected, base).to(C::VK)
}

const fn suru(inflected: &'static str, base: &'static str) -> Rule {
    Rule::replace(inflected, base).to(C::VS)
}

const fn zuru(inflected: &'static str, base: &'static str) -> Rule {
    Rule::replace(inflected, base).to(C::VZ)
}
