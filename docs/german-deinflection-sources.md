# German deinflection: rule groups and their sources

The German deinflector in `crates/core/src/deinflection/german/` undoes inflections by replacing endings, reversing umlauts and removing the ge- and zu of non-finite verb forms. Rules chain, so that gelesenen is traced back through gelesen to lesen. Irregular forms are listed in a lexicon. Every rule group and lexical table is drawn from the sources cited here and in a doc comment above it.

No GPL or LGPL code was read or used: not DWDSmor, SMOR, Zmorge, Yomitan or any deinflector derived from them. No non-commercial data (TIGER, DeReWo) and no share-alike data (UniMorph, Wiktionary, kaikki, IWNLP, UD treebanks) went into the rule tables or the fixtures.

## Scope

The deinflector undoes inflection in the sense of Schäfer (2018), Def. 7.10, pp. 210–211: conjugation, declension and comparison. It does not undo word formation (derivation, conversion, compounds) or analytic forms (hat gelesen, wird gelesen), which are separate words.

- **Verbs:** the present, past, subjunctive I and II, and imperative, by person and number; the past participle; the zu-infinitive of particle verbs (anzurufen); and, by the user's choice, the present participle (lesend → lesen), which both sources treat as an adjective formed from the verb. Particle verbs written as one word lead to the particle verb (angerufen, anrief → anrufen). Separated particles (rief … an) are left to lookup.
- **Nouns:** the genitive and dative singular, the plural, the dative plural, and the ending of weak nouns. Rules work at the end of the word, so they also inflect the last part of a compound (Kinderbüchern → Kinderbuch).
- **Adjectives:** declension, comparison, and chains of both (schnellsten → schnell). Declined participles go back to the verb (gelesenen → lesen).
- **Adverbs:** the comparison of gern and oft (lieber, am liebsten → gern).
- **Determiners:** the declined forms of articles and pronouns with adjective-like endings (meinem → mein, unserer → unser, diesem → dieser, keinen → kein, welches → welcher, jedem → jeder). Personal pronouns are not deinflected, because dictionaries list mir and ich separately.

## Sources

| Short name | Source | Licence | Use |
|---|---|---|---|
| S18 | Roland Schäfer, *Einführung in die grammatische Beschreibung des Deutschen*, 3rd ed., Language Science Press 2018, DOI 10.5281/zenodo.1421660 | CC BY 4.0 | Primary grammar source, cited by printed page and table |
| RW | Rat für deutsche Rechtschreibung, *Amtliches Regelwerk der deutschen Rechtschreibung* 2024, <https://www.rechtschreibrat.com/DOX/RfdR_Amtliches-Regelwerk_2024.pdf> | CC BY 4.0 | Primary spelling source: verb particles, ß and ss, capitalization, consonant doubling |
| grammis | IDS, grammis: Propädeutische Grammatik (`https://grammis.ids-mannheim.de/progr@mm/<unit>`), Systematische Grammatik and Kontrastive Grammatik, read 2026-10-05 | All rights reserved | Grammar reference for facts and as a check. No text, table or list is copied wholesale |
| WD | Wikidata lexemes, dump of 2026-09-30 (`latest-lexemes.json.gz`) | CC0 | Forms of the irregular verbs and the umlaut adjectives; the test oracle |
| WP-DD | <https://de.wikipedia.org/w/index.php?title=Deutsche_Deklination&oldid=270208356>, citing Duden, *Die Grammatik*, 8th ed. 2009, pp. 365–366 | CC BY-SA (cited for facts only) | Schwa loss in declined adjectives in -el, -er, -en; the stem hoh- of hoch |
| WP-AS | <https://de.wikipedia.org/w/index.php?title=Adelungsche_s-Schreibung&oldid=258893330>, citing Adelung 1788 and Noack 2000 | CC BY-SA (cited for facts only) | The pre-1996 ß rule |

The Duden grammar, Eisenberg's *Grundriss* and Helbig/Buscha have no open-access edition and were not read.

## Word classes

Results carry the classes that German Yomitan dictionaries put in their rules column: `v`, `n` and `adj`. Two more are added: `adv`, so that lieber and am liebsten match gern, and `det`, for declined determiners. Dictionaries leave adverbs and determiners without classes, so lookup lets a deinflected candidate of class `adv` or `det` match an entry with no classes (`is_unmarked_word_class` in `crates/core/src/deinflection/mod.rs`).

While a chain is undone, two internal states link rules and are never reported: a **declined** adjective form whose ending has been removed (schnellst in schnellsten, which the superlative rules accept), and a **plural** whose dative -n has been removed (Häuser in Häusern, which the plural rules accept).

Noun rules apply only to capitalized words and all other rules only to words in lowercase, because German capitalizes nouns (RW § 55, p. 83). A capitalized word at the start of a sentence is also tried in lowercase (see [Spelling variants](#spelling-variants)).

## Inflection names

Results list inflections outermost first, so gelesenen gives `declined`, `past participle`. Finite verb forms name the tense or mood, then every person and number the form can stand for; one surface form may give several results, such as lachte → `past 1sg/3sg` and `subjunctive II 1sg/3sg`.

| Name | Forms |
|---|---|
| `present 1sg`, `present 2sg`, `present 3sg`, `present 1sg/3sg`, `present 3sg/2pl`, `present 1pl/3pl`, `present 2pl` | lache, lachst, gibt, kann, lacht, lachen, seid |
| `past 1sg/3sg`, `past 2sg`, `past 1pl/3pl`, `past 2pl` | lachte, gingst, gingen, gingt |
| `subjunctive I 1sg/3sg`, `subjunctive I 2sg`, `subjunctive I 1pl/3pl`, `subjunctive I 2pl` | lache, lachest, lachen, lachet |
| `subjunctive II 1sg/3sg`, `subjunctive II 2sg`, `subjunctive II 1pl/3pl`, `subjunctive II 2pl` | ginge, gingest, gingen, ginget |
| `imperative sg`, `imperative pl` | lach, lache, gib; lacht |
| `past participle` | gemacht, gegangen, angerufen, besucht, studiert |
| `present participle` | lesend, lächelnd |
| `zu-infinitive` | anzurufen |
| `plural` | Häuser, Frauen, Autos, Museen |
| `genitive` | Hauses, Namens |
| `dative` | Hause; with `plural`, the dative plural (Häusern → `dative`, `plural`) |
| `oblique` | the -(e)n of weak nouns in every singular form but the nominative (Menschen) |
| `declined` | an adjective or determiner ending: -e, -en, -er, -es, -em |
| `comparative`, `superlative` | schneller, älter, besser; schnellst-, best- |

The finite names are listed with their paradigm and persons in `FINITE_FORMS` in `german/inflection.rs`. `deinflection::german::is_finite_verb` reports whether a deinflection is a finite verb form: class `v` and a single inflection from that list. Participles, infinitives, declined forms and the unchanged text are not finite.

When a regular ending leads to a verb of the irregular lexicon, alone or after particles and an inseparable prefix, only the readings that the verb can have are kept (`lexicon/regular_readings.rs`). Persons whose present form the lexicon lists are removed: lauft and verlauft give `present 2pl` and `imperative pl`, not `present 3sg/2pl`, and laufst gives no reading of laufen. A regular past, subjunctive II or participle is dropped when the lexicon lists the verb's own (gehte, gegeht). Three lists in `lexicon/weak_verbs.rs` keep every regular reading:

- the verbs that grammis 4074 lists with both strong and weak forms (backen, bewegen, erschrecken, hängen, löschen, quellen, schaffen, schleifen, schwellen, senden, stecken, weichen, wenden, wiegen and others), and dingen, whose weak forms Wikidata attests (L883783);
- weak homonyms of a strong verb: wachsen "to wax" (wachste, gewachst), from Duden online (`wachsen_gewachst`, a weak verb) and Wikidata L594187;
- weak verbs shaped like an inseparable prefix or a particle followed by a strong verb: begleiten (L486051), bekneifen (L752696), bereiten (L656275), beringen (L814855), umringen (L830568), verleiden (L881959), verspleißen (L765176), aufheißen (L836613), auspreisen (L837103), einpreisen (L781761), einringen (L756513), bevorraten (L815962). These are all the verbs of that shape with a weak past in the Wikidata dump, except erbitten, whose weak past erbittete is an error in Wikidata (Duden online gives erbat). Weak verbs whose shape is not prefix plus strong verb, such as beinhalten (be + inhalten), beerdigen, veranlassen (ver + anlassen) and verkörpern, are not narrowed in the first place.

The imperative singular is a fallback reading: lookup ranks a candidate whose only inflection is `imperative sg` below other candidates that match as much text through as many inflections (`is_fallback` in `crates/core/src/deinflection/mod.rs`), because the bare-stem imperative fits almost any word (Vögel → Vogel `plural` ranks above vögeln `imperative sg`).

## Rule groups

| Group | Table | Covers | Sources |
|---|---|---|---|
| Present, subjunctive I, imperative | `rules/finite.rs` `PRESENT` | -e, -st, -est, -t, -et, -en; -t for -st after s, ß, x, z (du reist); stems in -el, -er without their schwa (sammle, wandre, reglest); the bare-stem imperative | S18 Tab. 10.8 p. 303, Tab. 10.10 p. 305, Tab. 10.11 p. 306, Tab. 10.16 p. 310; grammis 4119; RW § 26 p. 48 |
| Weak past and subjunctive II | `rules/finite.rs` `WEAK_PAST` | -te, -test, -ten, -tet, and -ete … after dentals | S18 Tab. 10.8, Tab. 10.11; grammis 4119 |
| Infinitive in -eln, -ern | `rules/finite.rs` `EL_ER_INFINITIVE` | turns a restored -elen, -eren into -eln, -ern; undoes no inflection | grammis 4119 |
| Weak past participle | `rules/non_finite.rs` `PARTICIPLES` | ge-…-(e)t after up to two particles; inseparable prefix …-(e)t; -iert | S18 Tab. 10.13–10.15 pp. 308–309; grammis 5210 |
| Zu-infinitive | `rules/non_finite.rs` `ZU_INFINITIVES` | particle + zu + infinitive | S18 Tab. 10.4 p. 297; grammis Kontrastive Grammatik 3655; RW § 34 p. 56 |
| Present participle | `rules/non_finite.rs` `PRESENT_PARTICIPLES` | infinitive + -d, also declined | S18 p. 309; grammis Kontrastive Grammatik 3655 |
| Noun case | `rules/noun.rs` `CASE` | genitive -(e)s, -ns, -ens, -sses; dative -e; weak -(e)n; dative plural -n except after -n and -s | S18 Tab. 9.6 and Satz 9.2 pp. 262–263, § 9.2.4 p. 264; grammis 4066; RW § 5 (2) p. 36 |
| Noun plural | `rules/noun.rs` `PLURAL_ENDINGS` | -e, -er and zero with or without umlaut, -en, -n, -s, -innen, -sse, ä and ö for aa and oo (Säle), loanword plurals | S18 Tab. 9.3–9.5 and Satz 9.1 pp. 260–261; grammis 4065; RW § 5 (2) p. 36, § 9 E2 |
| Adjective declension | `rules/adjective.rs` `DECLENSION` | -e, -en, -er, -es, -em, also after a lost schwa (dunkle, teure) | S18 Tab. 9.12 p. 278; grammis 4067; WP-DD |
| Regular comparison | `rules/adjective.rs` `COMPARISON` | -(e)r, -r after -e, -ler, -rer, -ner; -st, -est, -t after s, ß, x, z | S18 Tab. 9.13 p. 283; grammis 4067, 5208 (2); RW § 26 p. 48 |
| Umlaut comparison | `lexicon/comparison.rs` `UMLAUT_COMPARISON` | 20 adjectives (alt, arm, groß, kurz, …), matched at the end of a word so that compounds compare too | WD lexemes per adjective; S18 pp. 220, 282, 283 (lang, kurz, scharf); grammis 5208 (1) for kalt and grob, and as the check |
| Suppletive comparison | `lexicon/comparison.rs` `SUPPLETIVE_COMPARISON` | gut, viel, wenig, hoch (and hoh-), nah(e); gern(e), oft | S18 p. 283; grammis 5208 (1, 4), 6896; WP-DD |
| Irregular verbs | `lexicon/irregular_verbs.rs` `IRREGULAR_VERBS` | 192 strong, mixed, modal and auxiliary verbs: present 2sg and 3sg, past, subjunctive II, participle, imperative singular; the other persons are derived | WD lexeme per row; grammis 4073–4076 where WD lacks a form, and as the check; S18 Tab. 10.9, 10.17, 10.18, 10.20 |
| Weak verbs with strong forms | `lexicon/irregular_verbs.rs` `WEAK_VERBS_WITH_STRONG_FORMS` | frug, gesalzen, gewunken, stak and four more | grammis 4074 |
| Person forms of irregular verbs | `lexicon/verb_forms.rs` | -st/-est, -en/-n, -t/-et on the past and subjunctive II; the subjunctive II without schwa (hättst, wär), only where umlaut or another stem still tells it from the past | S18 Tab. 10.9, 10.10, 10.12, 10.20; grammis 4119 |
| Irregular participles | `lexicon/verb_forms.rs` | ge- removed after particles or replaced by an inseparable prefix (vergangen, aufgestanden); verbs starting with ge (gegangen, but gewonnen) | S18 Tab. 10.14–10.15 p. 309; grammis 5210 |
| Suppletive verb forms | `lexicon/suppletive_forms.rs` | the present of the modal verbs, wissen, sein, haben, werden; the subjunctive I of sein; tun and seiend | S18 Tab. 10.17 p. 311, Tab. 10.20 p. 314; grammis 4075, 4076; WD L302572 (tun), L1761 (sein) |
| Determiners | `lexicon/determiners.rs` | ein, kein, the possessives (unser, unsr-, euer, eur-), dies-, jen-, solch-, welch-, jed-, manch- and others | S18 Tab. 9.7 p. 270, Tab. 9.8 p. 273, Tab. 9.11 p. 275; grammis 4062, 4063 |
| Separable first parts | `particles.rs` | 84 particles of the rules; 156 particles, adverbs and adjectives of the word list; 8 nouns; 6 colloquial particles; up to two in a row (her + unter) | see [Separable first parts](#separable-first-parts) |
| Inseparable prefixes | `opening.rs` | 16 prefixes | RW § 33; S18 Tab. 10.14; grammis Systematische Grammatik 1285, Kontrastive Grammatik 4859 |
| Readings of irregular verbs | `lexicon/regular_readings.rs`, `lexicon/weak_verbs.rs` | narrows regular endings for verbs of the lexicon, after particles and inseparable prefixes | the lexicon's sources; grammis 4074; Duden online; WD lexemes per verb |

### Separable first parts

The deinflector splits off up to two first parts in front of a verb, so that angerufen, losgegangen, festgehalten and heruntergefallen lead to the particle verb. The first parts come from four lists in `particles.rs`:

- **The rules of the Regelwerk** (84): the particles of RW § 34 (1.1), (1.2) with E2, and (1.3) with E4, pp. 56–58.
- **The official word list** (156): the Wörterverzeichnis of the Amtliches Regelwerk 2024 (pp. 165–343) has an entry for each first part that it writes together with a verb, with a reference to § 34 (1.2), (1.3), (2.1) or (2.2). The rules give these as open lists of examples; the word list names them one by one. They are listed here with the printed page of their entry, particles and adverbs first, then adjectives: abseits 165, aneinander 171, aufeinander 174, aufwärts 175, auswärts 175, beieinander 179, beiseite 179, da 192, dabei 192, dagegen 192, daheim 192, daher 192, dahin 192, dahinter 192, daneben 192, dort 198, durcheinander 200, einwärts 203, gegeneinander 220, herab 233, heran 233, herauf 233, hernieder 234, herum 234, herunter 234, hervor 234, herzu 234, herüber 234, hier 234, hinab 235, hinan 235, hinauf 235, hintereinander 235, hinunter 235, hinweg 235, hinzu 235, hoch 236, hops 237, ineinander 240, los 262, nebeneinander 270, quer 285, rück 291, seitwärts 301, umeinander 321, untereinander 323, voneinander 328, vornüber 328, vorwärts 328, vorüber 328, übereinander 320, zugute 341, zunichte 342; allein 169, arm 173, bankrott 178, bereit 179, blank 181, blau 182, blind 183, bloß 183, brach 184, breit 185, bunt 186, dicht 196, dunkel 200, einig 203, falsch 211, fein 211, fern 212, fertig 212, fest 212, flach 214, flüssig 214, frei 216, frisch 217, gar 219, geheim 220, gerade 222, gesund 223, glatt 223, gleich 224, grob 226, groß 227, gut 229, hart 232, heilig 233, heiß 233, hell 233, höher 236, kahl 246, kalt 246, kaputt 247, kirre 249, klar 249, klein 250, knapp 251, krank 254, krumm 255, kühl 255, kurz 256, lahm 257, lang 257, leck 259, leer 259, leicht 260, locker 262, madig 263, matt 264, nahe 270, näher 270, nass 270, niedrig 272, offen 275, plan 281, platt 281, pleite 281, rein 289, richtig 290, ruhig 292, rund 292, satt 294, sauber 294, scharf 294, scheu 295, schief 295, schlank 296, schlapp 296, schlau 296, schlecht 296, schwach 299, schwarz 299, schwer 300, schön 298, selig 302, sicher 303, spitz 307, stark 308, steif 309, still 309, straff 310, stramm 310, tief 316, tot 317, trocken 318, voll 327, wach 330, warm 331, weich 331, weiß 332, wert 333, wohl 336, wund 336, zufrieden 341, ähnlich 168, übel 320.
- **Nouns** (8): eis, kopf, leid, not, stand, statt, teil, wunder. RW § 34 (3), p. 58, lists them as a closed set.
- **Colloquial particles** (6): ran, raus, rum, runter, rauf, rüber, the short forms of heran, heraus and hinaus, herum, herunter and hinunter, herauf and hinauf, herüber and hinüber. Duden online marks each as an adverb, „umgangssprachlich" (read 2026-10-05), and S18 p. 511 (27c) uses rauskommst. Rein, the short form of herein and hinein, is in the word list already.

Left out:

- maß- (maßhalten) and kennen- (kennenlernen), which RW § 34 E6 and E7 allow to be written apart or together;
- verbs as first parts (sitzen bleiben, spazieren gehen), which RW § 34 (4) writes apart;
- the misread word-list entries alle, miss and r; miss- is an inseparable prefix (RW § 33);
- first parts that have no entry of their own in the word list and no other source.

### The subjunctive II without schwa

The subjunctive II may drop its schwa (hätt(e)st, wär(e)), but only where the schwa is not the only mark of the mood. grammis 4119 states that the schwa of verb endings tends to drop in speech when it violates no phonotactic rule and marks no inflection, and that riefst for riefest is impossible because it would equal the past. Its examples (läg(e), hätt(e)st) and S18 Tab. 10.20 (wär(-e), wär(-e)-st) all have umlaut. So the deinflector drops the schwa only when the shortened form still differs from the past: wär, hätt, käm and würd are read as subjunctive II, but ging, gingst and gingt are not, because they equal the past of gehen. Ging is read only as `past 1sg/3sg`. The forms are colloquial: grammis places them in spoken language, and RW § 80 (3), p. 150, marks such left-out letters with an apostrophe when writing imitates speech (müsst’ ich), while allowing frequent forms without one. S18 lists wär(-e) in the paradigm of sein without a label. No source found gives a shortened subjunctive that equals the past.

### Irregular verbs

The list of irregular verbs and their forms were built from Wikidata lexemes and checked against grammis units 4073–4076; S18 gives the structure of each paradigm. Each row of `IRREGULAR_VERBS` names its Wikidata lexeme. Where a row names grammis for some forms, Wikidata lacks those forms or gives wrong ones (liegen → gelegt, ringen → rangt, brennen → brannten, bringen → brächt), and the forms are those that grammis states. 27 rows have no Wikidata lexeme with strong forms and rest on grammis alone (bleichen, dingen, glimmen, gären, kneifen, küren, schaffen, weben, weichen and others). Speisen, which grammis lists as strong, is left out, because no source attests a strong form.

## Spelling variants

Each text is also tried in these spellings, which are listed as unchanged results of their own (`german/spelling.rs`):

- **Lowercase:** a capitalized word in lowercase, because the first word of a sentence is capitalized (RW § 54, p. 81). Gingen → gingen → gehen.
- **Pre-1996 ß:** every ß at the end of the word or before a consonant as ss, as written since the reform (WP-AS; RW § 25 and E1, p. 48). daß → dass, mußte → musste.
- **Swiss ss:** each ss as ß, as Switzerland and Liechtenstein write ss for ß (RW § 25 E2, p. 48). Strasse → Straße.

Both spelling variants apply to every German tag.

## Deliberate exclusions

- **Separated particles** (rief … an) are left to lookup.
- **Unlisted first parts:** first parts that none of the four lists names are not split off. Weak forms of such verbs still deinflect when the change is at the end of the word.
- **Word formation:** derivation, conversion and compounds. Lexicalized nominalizations are left to the dictionary.
- **Personal pronouns** (mir → ich) and the definite article (dem → der).
- **Loanword plurals** beyond those in grammis 4065 (Kosmetika, Praktika, Signori, Basen, Klimate, Atlanten), and other irregular plurals (Bauten, Viecher).
- **Superlatives of adjectives in -e** that drop the e (trägst-): no source states the rule.
- **Capitals throughout** (HÄUSER, STRASSE) are not lowercased; case-insensitive matching is left to lookup and storage.
- **Lowercase nouns:** noun rules require a capital, so all-lowercase text (häusern) is not traced back to a noun.

## Oracles

- **Wikidata** (`german/fixtures/wikidata-cases.json`, generated by `german/fixtures/generate-wikidata-cases.cjs` from the CC0 dump of 2026-09-30): lexemes drawn with a fixed seed from groups that cover the rule groups (strong and weak verbs with and without a particle or prefix, verbs in -eln, -ern and -ieren, nouns by plural ending, adjectives), with every single-word form except the dictionary form. The fixture holds 3,130 forms of 928 lexemes. The test asserts that each form yields its dictionary form with its class, except for the forms of a listed set of lexemes: errors in Wikidata, other spellings of the lemma, and forms outside the scope above. 3,054 forms pass (97.6 %); the largest group of the 76 that fail is the plural Bauten of 35 compounds of Bau.
- **Hand-written adjectives** (`german/adjective_cases.rs`): our own examples of declension and comparison, following S18 Tab. 9.12 and 9.13 and the lexicon's sources, because Wikidata lists few adjective forms.
- **Lookup** (`crates/core/src/lookup/german_lookup_tests.rs`): from text to the entry of its dictionary form, including the ranking of fallback readings.

## Points of uncertainty

- A weak verb shaped like a prefix plus a strong verb that neither Wikidata nor the lists above name loses its regular readings. The list of such verbs covers only lexemes that Wikidata gives a past for.
- The umlaut adjectives kalt and grob rest on grammis 5208 (1) alone; Wikidata and S18 lack their comparatives. The optional umlauts (blass, fromm, gesund, glatt, schmal and others) are covered only in their regular forms.
- Particle stacking (her + unter) goes beyond the lists, which name compound particles such as heraus and herunter individually. With about 250 first parts, stacking also allows unlikely splits; the dictionary filters the results.
- The Swiss variant overgenerates (Masse → Maße), and the bare-stem imperative overgenerates in formats without word classes (Haus → hausen); both rank below the unchanged text.
