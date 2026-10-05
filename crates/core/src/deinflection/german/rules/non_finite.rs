//! Regular non-finite verb forms: the weak past participle, the zu-infinitive of particle verbs, and the present participle.

use crate::deinflection::german::inflection::*;
use crate::deinflection::german::opening::Opening;
use crate::deinflection::german::rule::Rule;
use crate::deinflection::german::word_class::WordClasses as C;

/// The weak past participle is formed with ge- and -t, or -et after the stems that keep a schwa.
/// A particle stands before the ge- (aus-ge-lacht); an inseparable prefix replaces it (ver-lacht).
/// Verbs in -ieren take no ge- (studiert). Participles used as adjectives are also undone once their ending is removed.
///
/// Sources: Schäfer (2018), Tab. 10.13 to 10.15, pp. 308–309; grammis, unit 5210 (formation of the participle II).
pub const PARTICIPLES: &[Rule] = &[
    participle("t").opening(Opening::Augment),
    participle("et").opening(Opening::Augment),
    participle("t").opening(Opening::Inseparable),
    participle("et").opening(Opening::Inseparable),
    Rule::replace("iert", "ieren")
        .from(C::INPUT.or(C::DECLINED))
        .named(&[PAST_PARTICIPLE]),
];

/// Particle verbs write zu between the particle and the infinitive (an-zu-rufen, ab-zu-tun); other verbs write it apart.
///
/// Sources: Schäfer (2018), Tab. 10.4, p. 297; grammis, Kontrastive Grammatik, unit 3655;
/// Amtliches Regelwerk (2024), § 34, p. 56.
pub const ZU_INFINITIVES: &[Rule] = &[
    Rule::replace("en", "en")
        .opening(Opening::ZuInfix)
        .named(&[ZU_INFINITIVE]),
    Rule::replace("n", "n")
        .opening(Opening::ZuInfix)
        .named(&[ZU_INFINITIVE]),
];

/// The present participle is the infinitive with -d (lesen-d, lächeln-d), and declines like an adjective.
/// Both sources treat it as an adjective formed from the verb; it is undone to the verb here by choice.
///
/// Sources: Schäfer (2018), p. 309; grammis, Kontrastive Grammatik, unit 3655.
pub const PRESENT_PARTICIPLES: &[Rule] = &[Rule::replace("nd", "n")
    .from(C::INPUT.or(C::DECLINED))
    .named(&[PRESENT_PARTICIPLE])];

const fn participle(ending: &'static str) -> Rule {
    Rule::replace(ending, "en")
        .from(C::INPUT.or(C::DECLINED))
        .named(&[PAST_PARTICIPLE])
}

#[cfg(test)]
mod tests {
    use crate::deinflection::german::test_support::yields;

    #[test]
    fn undoes_a_weak_participle() {
        assert!(yields("gemacht", "machen", "v", &["past participle"]));
    }

    #[test]
    fn undoes_a_weak_participle_with_schwa() {
        assert!(yields("gearbeitet", "arbeiten", "v", &["past participle"]));
    }

    #[test]
    fn undoes_the_participle_of_a_particle_verb() {
        assert!(yields("ausgelacht", "auslachen", "v", &["past participle"]));
    }

    #[test]
    fn undoes_the_participle_of_a_prefix_verb() {
        assert!(yields("besucht", "besuchen", "v", &["past participle"]));
    }

    #[test]
    fn undoes_the_participle_of_a_verb_with_particle_and_prefix() {
        assert!(yields(
            "vorbereitet",
            "vorbereiten",
            "v",
            &["past participle"]
        ));
    }

    #[test]
    fn undoes_the_participle_of_a_verb_in_ieren() {
        assert!(yields("studiert", "studieren", "v", &["past participle"]));
    }

    #[test]
    fn undoes_the_participle_of_a_verb_in_el() {
        assert!(yields("gesammelt", "sammeln", "v", &["past participle"]));
    }

    #[test]
    fn undoes_a_declined_participle() {
        assert!(yields(
            "gemachten",
            "machen",
            "v",
            &["declined", "past participle"]
        ));
    }

    #[test]
    fn undoes_a_zu_infinitive() {
        assert!(yields("anzurufen", "anrufen", "v", &["zu-infinitive"]));
    }

    #[test]
    fn undoes_a_zu_infinitive_of_a_verb_in_el() {
        assert!(yields(
            "anzuzweifeln",
            "anzweifeln",
            "v",
            &["zu-infinitive"]
        ));
    }

    #[test]
    fn undoes_a_present_participle() {
        assert!(yields("lesend", "lesen", "v", &["present participle"]));
    }

    #[test]
    fn undoes_the_present_participle_of_a_particle_verb() {
        assert!(yields("anrufend", "anrufen", "v", &["present participle"]));
    }

    #[test]
    fn undoes_a_declined_present_participle() {
        assert!(yields(
            "lesende",
            "lesen",
            "v",
            &["declined", "present participle"]
        ));
    }
}
