//! The godan forms of する verbs whose stem is a single kanji, such as 愛する.

use crate::deinflection::japanese::rule::{Rule, Stem};
use crate::deinflection::japanese::word_class::WordClasses as C;

/// A する verb with a one-kanji stem also inflects as a godan verb in す: 愛さない, 愛せる, 愛そう.
/// UniDic lists these godan forms under the lemma of the する verb, so the godan verb is traced on to it.
///
/// Source: UniDic 2025.12, 五段-サ行 entries such as 愛す, 訳す and 略す, whose lemma is 愛する, 訳する and 略する,
/// and the potential 愛せる (下一段-サ行) with the lemma 愛する.
pub const GODAN_SURU: &[Rule] = &[Rule::replace("す", "する")
    .from(C::V5)
    .to(C::VS)
    .stem(Stem::SingleKanji)];

#[cfg(test)]
mod tests {
    use crate::deinflection::japanese::test_support::yields;

    #[test]
    fn traces_a_godan_negative_to_the_suru_verb() {
        assert!(yields("愛さない", "愛する", "vs", &["negative"]));
    }

    #[test]
    fn traces_a_godan_potential_to_the_suru_verb() {
        assert!(yields("愛せる", "愛する", "vs", &["potential"]));
    }

    #[test]
    fn keeps_the_regular_suru_past() {
        assert!(yields("愛した", "愛する", "vs", &["past"]));
    }

    #[test]
    fn does_not_trace_a_longer_stem_to_a_suru_verb() {
        assert!(!yields("引き出さない", "引き出する", "vs", &["negative"]));
    }
}
