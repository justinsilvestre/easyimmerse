//! Rules that turn a verb stem back into its dictionary form. They undo no inflection of their own:
//! the suffix rules that produce a stem name the inflection.

use super::{godan, ichidan, kuru, sharing, suru, zuru};
use crate::deinflection::japanese::rule::Rule;
use crate::deinflection::japanese::word_class::WordClasses as C;

/// Continuative stems (ren'yōkei): the godan い row, the bare ichidan stem, き for 来る, し for する, じ for ずる,
/// and the stems in い of the honorific verbs いらっしゃる, おっしゃる, くださる, なさる and ござる.
///
/// Sources: <https://en.wikipedia.org/w/index.php?title=Japanese_conjugation&oldid=1377029019#Verb_bases>
/// and <https://en.wiktionary.org/w/index.php?title=Appendix:Japanese_verbs&oldid=92311215#Inflected_forms>.
pub const CONTINUATIVE: &[Rule] = &sharing(
    [
        godan("き", "く"),
        godan("ぎ", "ぐ"),
        godan("し", "す"),
        godan("ち", "つ"),
        godan("に", "ぬ"),
        godan("び", "ぶ"),
        godan("み", "む"),
        godan("り", "る"),
        godan("い", "う"),
        ichidan("", "る"),
        kuru("き", "くる"),
        kuru("来", "来る"),
        suru("し", "する"),
        zuru("じ", "ずる"),
        godan("いらっしゃい", "いらっしゃる"),
        godan("おっしゃい", "おっしゃる"),
        godan("仰い", "仰る"),
        godan("ください", "くださる"),
        godan("下さい", "下さる"),
        godan("なさい", "なさる"),
        godan("為さい", "為さる"),
        godan("ござい", "ござる"),
        godan("御座い", "御座る"),
    ],
    C::CONTINUATIVE,
    &[],
);

/// Irrealis stems (mizenkei) before the negative suffixes: the godan あ row (わ for verbs in う),
/// the bare ichidan stem, こ for 来る, し and せ for する, and じ and ぜ for ずる.
///
/// Sources: <https://en.wikipedia.org/w/index.php?title=Japanese_conjugation_(mizenkei_base)&oldid=1377950986#Negative:_Conjugation_table>
/// and <https://en.wiktionary.org/w/index.php?title=Appendix:Japanese_verbs&oldid=92311215#s-irregular_(サ行変格_sa-gyō_henkaku)>.
pub const IRREALIS: &[Rule] = &sharing(
    [
        godan("か", "く"),
        godan("が", "ぐ"),
        godan("さ", "す"),
        godan("た", "つ"),
        godan("な", "ぬ"),
        godan("ば", "ぶ"),
        godan("ま", "む"),
        godan("ら", "る"),
        godan("わ", "う"),
        ichidan("", "る"),
        kuru("こ", "くる"),
        kuru("来", "来る"),
        suru("し", "する"),
        suru("せ", "する"),
        zuru("じ", "ずる"),
        zuru("ぜ", "ずる"),
    ],
    C::IRREALIS,
    &[],
);

/// Euphonic stems (onbinkei) before た, て, たら and たり, or their voiced だ, で, だら and だり.
/// Godan verbs in く take い, in ぐ take voiced い, in す take し, in う, つ and る take っ,
/// and in ぬ, ぶ and む take voiced ん. 行く takes 行っ, and 問う and 請う keep their う.
/// Ichidan verbs use the bare stem, 来る uses き, する uses し and ずる uses じ.
///
/// Sources: <https://en.wiktionary.org/w/index.php?title=Appendix:Japanese_verbs&oldid=92311215#Complex_forms>
/// and <https://en.wikipedia.org/w/index.php?title=Japanese_conjugation_(ren%27y%C5%8Dkei_base)&oldid=1378034543#Gerund:_Conjugation_table>.
pub const ONBIN_TA: &[Rule] = &sharing(
    [
        godan("い", "く"),
        godan("し", "す"),
        godan("っ", "う"),
        godan("っ", "つ"),
        godan("っ", "る"),
        godan("いっ", "いく"),
        godan("行っ", "行く"),
        godan("問う", "問う"),
        godan("とう", "とう"),
        godan("請う", "請う"),
        godan("乞う", "乞う"),
        godan("こう", "こう"),
        ichidan("", "る"),
        kuru("き", "くる"),
        kuru("来", "来る"),
        suru("し", "する"),
        zuru("じ", "ずる"),
    ],
    C::ONBIN_TA,
    &[],
);

/// The voiced euphonic stems, from the same sources as [`ONBIN_TA`].
pub const ONBIN_DA: &[Rule] = &sharing(
    [
        godan("い", "ぐ"),
        godan("ん", "ぬ"),
        godan("ん", "ぶ"),
        godan("ん", "む"),
    ],
    C::ONBIN_DA,
    &[],
);
