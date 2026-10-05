//! The start of a verb form: separable particles, inseparable prefixes, and the ge- and zu of non-finite forms.

/// The verb particles that are written together with the verb in infinitives, participles and verb-final clauses.
///
/// Source: Amtliches Regelwerk der deutschen Rechtschreibung (2024), § 34 (1.1), (1.2) with E2, and (1.3) with E4, pp. 56–58.
pub const PARTICLES: [&str; 84] = [
    "ab",
    "an",
    "auf",
    "aus",
    "bei",
    "durch",
    "ein",
    "entgegen",
    "entlang",
    "gegen",
    "gegenüber",
    "hinter",
    "in",
    "mit",
    "nach",
    "über",
    "um",
    "unter",
    "vor",
    "wider",
    "zu",
    "zuwider",
    "zwischen",
    "abwärts",
    "auseinander",
    "beisammen",
    "davon",
    "davor",
    "dazu",
    "dazwischen",
    "empor",
    "fort",
    "her",
    "heraus",
    "herbei",
    "herein",
    "hin",
    "hinaus",
    "hindurch",
    "hinein",
    "hintenüber",
    "hinterher",
    "hinüber",
    "nebenher",
    "nieder",
    "rückwärts",
    "umher",
    "voran",
    "voraus",
    "vorbei",
    "vorher",
    "vorweg",
    "weg",
    "weiter",
    "wieder",
    "zurück",
    "zusammen",
    "zuvor",
    "dran",
    "drauf",
    "drauflos",
    "abhanden",
    "anheim",
    "bevor",
    "dar",
    "einher",
    "entzwei",
    "fürlieb",
    "hintan",
    "inne",
    "überein",
    "überhand",
    "umhin",
    "vorlieb",
    "zurecht",
    "fehl",
    "feil",
    "heim",
    "irre",
    "kund",
    "preis",
    "wahr",
    "weis",
    "wett",
];

/// The prefixes that stay attached to the verb and suppress the ge- of the past participle.
///
/// Sources: Schäfer, *Einführung in die grammatische Beschreibung des Deutschen*, 3rd ed. (2018), Tab. 10.14, p. 309;
/// grammis, Systematische Grammatik, unit 1285 (be-, ent-, er-, miss-, ver-, zer-);
/// grammis, Kontrastive Grammatik, unit 4859 (emp-, ge-);
/// Amtliches Regelwerk (2024), § 33 (2) and (3) (voll-, and durch-, hinter-, über-, um-, unter-, wider-, wieder-, which are also particles).
pub const INSEPARABLE_PREFIXES: [&str; 16] = [
    "be", "emp", "ent", "er", "ge", "miss", "ver", "zer", "durch", "hinter", "über", "um", "unter",
    "wider", "wieder", "voll",
];

/// The most particles matched in front of a verb. Two allow composites such as her + unter.
const MAX_PARTICLES: usize = 2;

/// What may stand before the part of a word that a rule rewrites.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(super) enum Opening {
    /// Anything: the rule looks only at the end of the word.
    Free,
    /// Nothing, or up to two particles and an optional inseparable prefix, all kept.
    Prefixed,
    /// Nothing, or up to two particles, followed by the participle prefix ge-, which is removed.
    Augment,
    /// Up to two particles and one inseparable prefix, all kept.
    Inseparable,
    /// One or two particles followed by the infix zu, which is removed.
    ZuInfix,
}

/// A way of dividing a word into a start that is kept and a rest that a rule rewrites.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(super) struct Split<'a> {
    pub kept: &'a str,
    pub rest: &'a str,
}

impl Opening {
    /// Lists the ways in which `text` can be divided under this opening.
    pub fn splits(self, text: &str) -> Vec<Split<'_>> {
        match self {
            Opening::Free => vec![Split {
                kept: "",
                rest: text,
            }],
            Opening::Prefixed => prefixed_splits(text),
            Opening::Augment => marked_splits(text, "ge", 0),
            Opening::Inseparable => inseparable_splits(text),
            Opening::ZuInfix => marked_splits(text, "zu", 1),
        }
    }
}

fn prefixed_splits(text: &str) -> Vec<Split<'_>> {
    let mut splits: Vec<Split> = particle_ends(text)
        .into_iter()
        .map(|end| split_at(text, end, end))
        .collect();
    splits.extend(inseparable_splits(text));
    splits.retain(|split| !split.rest.is_empty());
    splits
}

fn inseparable_splits(text: &str) -> Vec<Split<'_>> {
    particle_ends(text)
        .into_iter()
        .flat_map(|end| {
            INSEPARABLE_PREFIXES
                .iter()
                .filter(move |prefix| text[end..].starts_with(*prefix))
                .map(move |prefix| split_at(text, end + prefix.len(), end + prefix.len()))
        })
        .filter(|split| !split.rest.is_empty())
        .collect()
}

fn marked_splits<'a>(text: &'a str, marker: &str, min_particles: usize) -> Vec<Split<'a>> {
    particle_ends_counted(text)
        .into_iter()
        .filter(|(_, count)| *count >= min_particles)
        .filter(|(end, _)| text[*end..].starts_with(marker))
        .map(|(end, _)| split_at(text, end, end + marker.len()))
        .filter(|split| !split.rest.is_empty())
        .collect()
}

fn split_at(text: &str, kept_end: usize, rest_start: usize) -> Split<'_> {
    Split {
        kept: &text[..kept_end],
        rest: &text[rest_start..],
    }
}

fn particle_ends(text: &str) -> Vec<usize> {
    particle_ends_counted(text)
        .into_iter()
        .map(|(end, _)| end)
        .collect()
}

/// The byte offsets at which a sequence of particles at the start of `text` may end, with the number of particles.
fn particle_ends_counted(text: &str) -> Vec<(usize, usize)> {
    let mut ends = vec![(0, 0)];
    let mut frontier = vec![0];
    for count in 1..=MAX_PARTICLES {
        frontier = frontier
            .into_iter()
            .flat_map(|start| following_particle_ends(text, start))
            .collect();
        ends.extend(frontier.iter().map(|end| (*end, count)));
    }
    ends
}

fn following_particle_ends(text: &str, start: usize) -> Vec<usize> {
    PARTICLES
        .iter()
        .filter(|particle| text[start..].starts_with(*particle))
        .map(|particle| start + particle.len())
        .collect()
}

#[cfg(test)]
mod tests {
    use super::{Opening, Split};

    fn rests(opening: Opening, text: &str) -> Vec<(String, String)> {
        opening
            .splits(text)
            .into_iter()
            .map(|Split { kept, rest }| (kept.to_string(), rest.to_string()))
            .collect()
    }

    fn pair(kept: &str, rest: &str) -> (String, String) {
        (kept.to_string(), rest.to_string())
    }

    #[test]
    fn augment_removes_ge_after_a_particle() {
        assert!(rests(Opening::Augment, "angerufen").contains(&pair("an", "rufen")));
    }

    #[test]
    fn augment_removes_ge_after_two_particles() {
        assert!(rests(Opening::Augment, "heruntergefallen").contains(&pair("herunter", "fallen")));
    }

    #[test]
    fn zu_infix_needs_a_particle() {
        assert_eq!(rests(Opening::ZuInfix, "zulassen"), Vec::new());
    }

    #[test]
    fn zu_infix_removes_zu_after_a_particle() {
        assert_eq!(rests(Opening::ZuInfix, "anzurufen"), [pair("an", "rufen")]);
    }

    #[test]
    fn inseparable_keeps_the_prefix() {
        assert!(rests(Opening::Inseparable, "verstanden").contains(&pair("ver", "standen")));
    }

    #[test]
    fn prefixed_includes_the_whole_word() {
        assert!(rests(Opening::Prefixed, "ankam").contains(&pair("", "ankam")));
    }

    #[test]
    fn prefixed_splits_off_a_particle_and_a_prefix() {
        assert!(rests(Opening::Prefixed, "anerkannte").contains(&pair("aner", "kannte")));
    }
}
