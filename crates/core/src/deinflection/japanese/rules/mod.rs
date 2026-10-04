//! The rule tables, one module per group of related inflections.

mod adjective;
mod negative;
mod perfective;
mod stems;

use super::rule::{Rule, Stem};
use super::word_class::WordClasses as C;

/// Every rule group.
pub const ALL: &[&[Rule]] = &[
    stems::CONTINUATIVE,
    stems::IRREALIS,
    stems::ONBIN_TA,
    stems::ONBIN_DA,
    adjective::ADJECTIVE_STEM,
    perfective::PERFECTIVE,
    negative::NEGATIVE,
    adjective::ADJECTIVE,
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
