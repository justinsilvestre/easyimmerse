//! Strong, mixed, modal and auxiliary verbs, whose stems change in ways that no regular rule predicts.

/// The forms of a verb that regular rules cannot derive. An empty string means that the regular form applies.
/// Several forms in one field are separated by a slash.
#[derive(Debug, Clone, Copy)]
pub(super) struct IrregularVerb {
    pub infinitive: &'static str,
    pub present_2sg: &'static str,
    pub present_3sg: &'static str,
    /// The 1st and 3rd person singular past, to which the other persons add endings.
    pub past: &'static str,
    /// The 1st and 3rd person singular subjunctive II, to which the other persons add endings.
    pub subjunctive_ii: &'static str,
    pub past_participle: &'static str,
    pub imperative_sg: &'static str,
}

/// The strong verbs, the mixed verbs (brennen, brachte), the modal verbs with wissen, and sein, haben and werden.
/// Verbs formed from these with a particle or an inseparable prefix (verstehen, anfangen) are reached through those.
///
/// The forms come from the Wikidata lexeme named after each row (CC0, dump of 2026-09-30).
/// Where the row names grammis instead, for some or all of its forms, Wikidata lacks those forms or gives wrong ones,
/// and the forms are those that grammis states: Propädeutische Grammatik, units 4073 (mixed verbs), 4074 (strong verbs,
/// by vowel series), 4075 (modal verbs and wissen) and 4076 (sein, haben, werden).
/// Every row was checked against those units.
/// Schäfer (2018), Tab. 10.9, p. 304, Tab. 10.17 and 10.18, pp. 311–312, and Tab. 10.20, p. 314, give the structure of these paradigms.
pub(super) static IRREGULAR_VERBS: [IrregularVerb; 192] = [
    verb(
        "backen",
        "backst/bäckst",
        "backt/bäckt",
        "buk",
        "büke",
        "gebacken",
        "",
    ), // L1310758; present 2sg, present 3sg, subjunctive II, participle: grammis 4074
    verb(
        "befehlen",
        "befiehlst",
        "befiehlt",
        "befahl",
        "befähle/beföhle",
        "befohlen",
        "befiehl",
    ), // L511977
    verb("befleißen", "", "", "befliss", "beflisse", "beflissen", ""), // L800672
    verb(
        "beginnen",
        "",
        "",
        "begann",
        "begänne/begönne",
        "begonnen",
        "",
    ), // L408964
    verb("beißen", "", "", "biss", "bisse", "gebissen", ""),           // L511980
    verb(
        "bergen", "birgst", "birgt", "barg", "bärge", "geborgen", "birg",
    ), // L813974
    verb(
        "bersten",
        "birst",
        "birst",
        "barst",
        "bärste",
        "geborsten",
        "birst",
    ), // L815346
    verb("bewegen", "", "", "bewog", "bewöge", "bewogen", ""), // L1569175; past, participle: grammis 4074
    verb("biegen", "", "", "bog", "böge", "gebogen", ""),      // L867569
    verb("bieten", "", "", "bot", "böte", "geboten", ""),      // L412440
    verb("binden", "", "", "band", "bände", "gebunden", ""),   // L511982
    verb("bitten", "", "", "bat", "bäte", "gebeten", ""),      // L511978
    verb(
        "blasen", "bläst", "bläst", "blies", "bliese", "geblasen", "",
    ), // L511988
    verb("bleiben", "", "", "blieb", "bliebe", "geblieben", ""), // L301640
    verb("bleichen", "", "", "blich", "bliche", "geblichen", ""), // grammis 4074
    verb(
        "braten", "brätst", "brät", "briet", "briete", "gebraten", "",
    ), // L511987
    verb(
        "brechen",
        "brichst",
        "bricht",
        "brach",
        "bräche",
        "gebrochen",
        "brich",
    ), // L1775,L7424
    verb(
        "brennen",
        "brennst",
        "brennt",
        "brannte",
        "brennte",
        "gebrannt",
        "brenn/brenne",
    ), // L527678; past: grammis 4073
    verb(
        "bringen",
        "bringst",
        "bringt",
        "brachte",
        "brächte",
        "gebracht",
        "bring/bringe",
    ), // L488285; subjunctive II: grammis 4073
    verb(
        "denken",
        "denkst",
        "denkt",
        "dachte",
        "dächte",
        "gedacht",
        "denk/denke",
    ), // L3388
    verb("dingen", "", "", "dang", "", "gedungen", ""),        // grammis 4074
    verb(
        "dreschen",
        "drischst",
        "drischt",
        "drasch/drosch",
        "dräsche/drösche",
        "gedroschen",
        "drisch",
    ), // L855533
    verb("dringen", "", "", "drang", "dränge", "gedrungen", ""), // L855493
    verb(
        "dünken",
        "dünkst",
        "dünkt",
        "deuchte",
        "deuchte",
        "gedeucht",
        "dünk/dünke",
    ), // grammis 4073
    verb(
        "dürfen", "darfst", "darf", "durfte", "dürfte", "gedurft", "",
    ), // L290331
    verb(
        "empfangen",
        "empfängst",
        "empfängt",
        "empfing",
        "empfinge",
        "empfangen",
        "",
    ), // L886806
    verb(
        "empfehlen",
        "empfiehlst",
        "empfiehlt",
        "empfahl",
        "empfähle/empföhle",
        "empfohlen",
        "empfiehl",
    ), // L511989
    verb("empfinden", "", "", "empfand", "empfände", "empfunden", ""), // L886740
    verb("erkiesen", "", "", "erkor", "erköre", "erkoren", ""), // L900285
    verb(
        "erlöschen",
        "erlischst",
        "erlischt",
        "erlosch",
        "erlösche",
        "erloschen",
        "erlisch",
    ), // grammis 4074
    verb(
        "erschallen",
        "",
        "",
        "erscholl",
        "erschölle",
        "erschollen",
        "",
    ), // grammis 4074
    verb(
        "erschrecken",
        "erschrickst",
        "erschrickt",
        "erschrak",
        "erschräke",
        "erschrocken",
        "erschrick",
    ), // L1570162
    verb("essen", "isst", "isst", "aß", "äße", "gegessen", "iss"), // L42932
    verb("fahren", "fährst", "fährt", "fuhr", "führe", "gefahren", ""), // L8721
    verb("fallen", "fällst", "fällt", "fiel", "fiele", "gefallen", ""), // L501494
    verb("fangen", "fängst", "fängt", "fing", "finge", "gefangen", ""), // L525342
    verb(
        "fechten",
        "fichtst",
        "ficht",
        "focht",
        "föchte",
        "gefochten",
        "ficht",
    ), // grammis 4074
    verb("finden", "", "", "fand", "fände", "gefunden", ""),   // L408965
    verb(
        "flechten",
        "flichtst",
        "flicht",
        "flocht",
        "flöchte",
        "geflochten",
        "flicht",
    ), // L691254
    verb("fliegen", "", "", "flog", "flöge", "geflogen", ""),  // L21353
    verb("fliehen", "", "", "floh", "flöhe", "geflohen", ""),  // L511986
    verb("fließen", "", "", "floss", "flösse", "geflossen", ""), // L671278; subjunctive II, participle: grammis 4074
    verb(
        "fressen",
        "frisst",
        "frisst",
        "fraß",
        "fräße",
        "gefressen",
        "friss",
    ), // L511990
    verb("frieren", "", "", "fror", "fröre", "gefroren", ""),    // L511985
    verb("geben", "gibst", "gibt", "gab", "gäbe", "gegeben", "gib"), // L248794
    verb(
        "gebären",
        "gebärst/gebierst",
        "gebärt/gebiert",
        "gebar",
        "gebäre",
        "geboren",
        "gebier",
    ), // L409117
    verb("gedeihen", "", "", "gedieh", "gediehe", "gediehen", ""), // L511984
    verb("gehen", "", "", "ging", "ginge", "gegangen", ""),      // L1026
    verb("gelingen", "", "", "gelang", "gelänge", "gelungen", ""), // L671228; subjunctive II, participle: grammis 4074
    verb(
        "gelten",
        "giltst",
        "gilt",
        "galt",
        "gälte/gölte",
        "gegolten",
        "gilt",
    ), // L492443
    verb("genesen", "", "", "genas", "genäse", "genesen", ""),     // L619667
    verb("genießen", "", "", "genoss", "genösse", "genossen", ""), // L488362
    verb(
        "geschehen",
        "geschiehst",
        "geschieht",
        "geschah",
        "geschähe",
        "geschehen",
        "geschieh",
    ), // L894994
    verb(
        "gewinnen",
        "",
        "",
        "gewann",
        "gewänne/gewönne",
        "gewonnen",
        "",
    ), // L477043
    verb("gießen", "", "", "goss", "gösse", "gegossen", ""),       // L511993
    verb("gleichen", "", "", "glich", "gliche", "geglichen", ""),  // L511992
    verb("gleiten", "", "", "glitt", "glitte", "geglitten", ""),   // L511991
    verb("glimmen", "", "", "glomm", "glömme", "geglommen", ""),   // grammis 4074
    verb("graben", "gräbst", "gräbt", "grub", "grübe", "gegraben", ""), // L511994
    verb("greifen", "", "", "griff", "griffe", "gegriffen", ""),   // L511996
    verb("gären", "", "", "gor", "göre", "gegoren", ""),           // grammis 4074
    verb(
        "haben", "hast", "hat", "hatte", "hätte", "gehabt", "hab/habe",
    ), // L4179
    verb(
        "halten", "hältst", "hält", "hielt", "hielte", "gehalten", "",
    ), // L409889
    verb("hauen", "", "", "hieb", "hiebe", "gehauen", ""), // L661588; past, subjunctive II, participle: grammis 4074
    verb("heben", "", "", "hob/hub", "höbe/hübe", "gehoben", ""), // L517093
    verb("heißen", "", "", "hieß", "hieße", "geheißen", ""), // L408561
    verb(
        "helfen",
        "hilfst",
        "hilft",
        "half",
        "hülfe/hälfe",
        "geholfen",
        "hilf",
    ), // L451227
    verb("hängen", "", "", "hing", "hinge", "gehangen", ""), // L658437; subjunctive II, participle: grammis 4074
    verb(
        "kennen",
        "kennst",
        "kennt",
        "kannte",
        "kennte",
        "gekannt",
        "kenne/kenn",
    ), // L2209
    verb("klimmen", "", "", "klomm", "klömme", "geklommen", ""), // L680217; subjunctive II, participle: grammis 4074
    verb("klingen", "", "", "klang", "klänge", "geklungen", ""), // L822336
    verb("kneifen", "", "", "kniff", "kniffe", "gekniffen", ""), // grammis 4074
    verb("kommen", "", "", "kam", "käme", "gekommen", ""),       // L315550
    verb("kriechen", "", "", "kroch", "kröche", "gekrochen", ""), // L516808
    verb(
        "können", "kannst", "kann", "konnte", "könnte", "gekonnt", "",
    ), // L315211
    verb("küren", "", "", "kor", "köre", "gekoren", ""),         // grammis 4074
    verb("laden", "lädst", "lädt", "lud", "lüde", "geladen", ""), // L1569177
    verb("lassen", "lässt", "lässt", "ließ", "ließe", "gelassen", ""), // L516915
    verb("laufen", "läufst", "läuft", "lief", "liefe", "gelaufen", ""), // L460388
    verb("leiden", "", "", "litt", "litte", "gelitten", ""),     // L615554
    verb("leihen", "", "", "lieh", "liehe", "geliehen", ""),     // L516825
    verb("lesen", "liest", "liest", "las", "läse", "gelesen", "lies"), // L1759
    verb("liegen", "", "", "lag", "läge", "gelegen", ""), // L525237; participle: grammis 4074
    verb("lügen", "", "", "log", "löge", "gelogen", ""),  // L516800
    verb("meiden", "", "", "mied", "miede", "gemieden", ""), // L618474
    verb(
        "melken",
        "melkst/milkst",
        "melkt/milkt",
        "molk",
        "mölke",
        "gemolken",
        "",
    ), // grammis 4074
    verb(
        "messen", "misst", "misst", "maß", "mäße", "gemessen", "miss",
    ), // L516835
    verb(
        "misslingen",
        "",
        "",
        "misslang",
        "misslänge",
        "misslungen",
        "",
    ), // L897995
    verb("mögen", "magst", "mag", "mochte", "möchte", "gemocht", ""), // L35037
    verb("müssen", "musst", "muss", "musste", "müsste", "gemusst", ""), // L315210
    verb(
        "nehmen", "nimmst", "nimmt", "nahm", "nähme", "genommen", "nimm",
    ), // L230708
    verb(
        "nennen",
        "nennst",
        "nennt",
        "nannte",
        "nennte",
        "genannt",
        "nenn/nenne",
    ), // L501487
    verb("pfeifen", "", "", "pfiff", "pfiffe", "gepfiffen", ""), // L516795
    verb("pflegen", "", "", "pflog", "pflöge", "gepflogen", ""), // L1360894
    verb("preisen", "", "", "pries", "priese", "gepriesen", ""), // L868796
    verb(
        "quellen",
        "quillst",
        "quillt",
        "quoll",
        "quölle",
        "gequollen",
        "quill",
    ), // grammis 4074
    verb("raten", "rätst", "rät", "riet", "riete", "geraten", ""), // L496256
    verb("reiben", "", "", "rieb", "riebe", "gerieben", ""), // L517091
    verb("reiten", "", "", "ritt", "ritte", "geritten", ""), // L409865
    verb("reißen", "", "", "riss", "risse", "gerissen", ""), // L517090
    verb(
        "rennen",
        "rennst",
        "rennt",
        "rannte",
        "rennte",
        "gerannt",
        "renn/renne",
    ), // L42931
    verb("riechen", "", "", "roch", "röche", "gerochen", ""), // L517089
    verb("ringen", "", "", "rang", "ränge", "gerungen", ""), // L719366; past, subjunctive II, participle: grammis 4074
    verb("rinnen", "", "", "rann", "ränne/rönne", "geronnen", ""), // grammis 4074
    verb("rufen", "", "", "rief", "riefe", "gerufen", ""),   // L827076
    verb("saufen", "säufst", "säuft", "soff", "söffe", "gesoffen", ""), // L866502
    verb("saugen", "", "", "sog", "söge", "gesogen", ""), // L657373; past, subjunctive II, participle: grammis 4074
    verb("schaffen", "", "", "schuf", "schüfe", "geschaffen", ""), // grammis 4074
    verb("scheiden", "", "", "schied", "schiede", "geschieden", ""), // L517082
    verb("scheinen", "", "", "schien", "schiene", "geschienen", ""), // L517081
    verb("scheißen", "", "", "schiss", "schisse", "geschissen", ""), // L842194
    verb(
        "schelten",
        "schiltst",
        "schilt",
        "schalt",
        "schälte",
        "gescholten",
        "schilt",
    ), // L843945
    verb("scheren", "", "", "schor", "schöre", "geschoren", ""), // grammis 4074
    verb("schieben", "", "", "schob", "schöbe", "geschoben", ""), // L517084
    verb("schießen", "", "", "schoss", "schösse", "geschossen", ""), // L517085
    verb("schinden", "", "", "schund", "schünde", "geschunden", ""), // grammis 4074
    verb(
        "schlafen",
        "schläfst",
        "schläft",
        "schlief",
        "schliefe",
        "geschlafen",
        "",
    ), // L46260
    verb(
        "schlagen",
        "schlägst",
        "schlägt",
        "schlug",
        "schlüge",
        "geschlagen",
        "",
    ), // L841689
    verb(
        "schleichen",
        "",
        "",
        "schlich",
        "schliche",
        "geschlichen",
        "",
    ), // L40398
    verb(
        "schleifen",
        "",
        "",
        "schliff",
        "schliffe",
        "geschliffen",
        "",
    ), // L677744,L677745; subjunctive II: grammis 4074
    verb(
        "schleißen",
        "",
        "",
        "schliss",
        "schlisse",
        "geschlissen",
        "",
    ), // grammis 4074
    verb(
        "schließen",
        "",
        "",
        "schloss",
        "schlösse",
        "geschlossen",
        "",
    ), // L517086
    verb(
        "schlingen",
        "",
        "",
        "schlang",
        "schlänge",
        "geschlungen",
        "",
    ), // grammis 4074
    verb(
        "schmeißen",
        "",
        "",
        "schmiss",
        "schmisse",
        "geschmissen",
        "",
    ), // L843045
    verb(
        "schmelzen",
        "schmilzt",
        "schmilzt",
        "schmolz",
        "schmölze",
        "geschmolzen",
        "schmilz",
    ), // grammis 4074
    verb("schnauben", "", "", "schnob", "schnöbe", "geschnoben", ""), // grammis 4074
    verb(
        "schneiden",
        "",
        "",
        "schnitt",
        "schnitte",
        "geschnitten",
        "",
    ), // L615572
    verb(
        "schreiben",
        "",
        "",
        "schrieb",
        "schriebe",
        "geschrieben",
        "",
    ), // L230497
    verb("schreien", "", "", "schrie", "schriee", "geschrien", ""), // L301556; subjunctive II: grammis 4074
    verb(
        "schreiten",
        "",
        "",
        "schritt",
        "schritte",
        "geschritten",
        "",
    ), // L842690
    verb(
        "schweigen",
        "",
        "",
        "schwieg",
        "schwiege",
        "geschwiegen",
        "",
    ), // L841224
    verb(
        "schwellen",
        "schwillst",
        "schwillt",
        "schwoll",
        "schwölle",
        "geschwollen",
        "schwill",
    ), // grammis 4074
    verb(
        "schwimmen",
        "",
        "",
        "schwamm",
        "schwämme/schwömme",
        "geschwommen",
        "",
    ), // L43036
    verb(
        "schwinden",
        "",
        "",
        "schwand",
        "schwände",
        "geschwunden",
        "",
    ), // L672593; past, subjunctive II, participle: grammis 4074
    verb(
        "schwingen",
        "",
        "",
        "schwang",
        "schwänge",
        "geschwungen",
        "",
    ), // L841398
    verb("schwären", "", "", "schwor", "", "geschworen", ""), // L313781; past, participle: grammis 4074
    verb(
        "schwören",
        "",
        "",
        "schwor/schwur",
        "schwöre/schwüre",
        "geschworen",
        "",
    ), // L517088
    verb(
        "sehen",
        "siehst",
        "sieht",
        "sah",
        "sähe",
        "gesehen",
        "sieh/siehe",
    ), // L21290
    verb("sein", "bist", "ist", "war", "wäre", "gewesen", "sei"), // L1761
    verb(
        "senden",
        "sendest",
        "sendet",
        "sandte",
        "sendete",
        "gesandt",
        "sende/send",
    ), // L889500; present 2sg, present 3sg, subjunctive II, participle, imperative: grammis 4073
    verb("sieden", "", "", "sott", "sötte", "gesotten", ""),  // L313782
    verb("singen", "", "", "sang", "sänge", "gesungen", ""),  // L46796
    verb("sinken", "", "", "sank", "sänke", "gesunken", ""),  // L615566
    verb("sinnen", "", "", "sann", "sänne", "gesonnen", ""),  // L825526
    verb("sitzen", "", "", "saß", "säße", "gesessen", ""),    // L615567
    verb(
        "sollen", "sollst", "soll", "sollte", "sollte", "gesollt", "",
    ), // L307941
    verb("speien", "", "", "spie", "spiee", "gespien", ""), // L890596; subjunctive II: grammis 4074
    verb("spinnen", "", "", "spann", "spänne", "gesponnen", ""), // L890102
    verb("spleißen", "", "", "spliss", "splisse", "gesplissen", ""), // grammis 4074
    verb(
        "sprechen",
        "sprichst",
        "spricht",
        "sprach",
        "spräche",
        "gesprochen",
        "sprich",
    ), // L2706
    verb("sprießen", "", "", "spross", "sprösse", "gesprossen", ""), // grammis 4074
    verb("springen", "", "", "sprang", "spränge", "gesprungen", ""), // L677266
    verb(
        "stechen",
        "stichst",
        "sticht",
        "stach",
        "stäche",
        "gestochen",
        "stich",
    ), // L593007
    verb("stehen", "", "", "stand", "stünde/stände", "gestanden", ""), // L34613; subjunctive II: grammis 4074
    verb(
        "stehlen",
        "stiehlst",
        "stiehlt",
        "stahl",
        "stähle/stöhle",
        "gestohlen",
        "stiehl",
    ), // L615571
    verb("steigen", "", "", "stieg", "stiege", "gestiegen", ""), // L672601; subjunctive II, participle: grammis 4074
    verb(
        "sterben",
        "stirbst",
        "stirbt",
        "starb",
        "stürbe",
        "gestorben",
        "stirb",
    ), // L222630
    verb("stieben", "", "", "stob", "stöbe", "gestoben", ""),    // grammis 4074
    verb("stinken", "", "", "stank", "stänke", "gestunken", ""), // L615569
    verb(
        "stoßen",
        "stößt",
        "stößt",
        "stieß",
        "stieße",
        "gestoßen",
        "",
    ), // L502179
    verb("streichen", "", "", "strich", "striche", "gestrichen", ""), // L616642
    verb("streiten", "", "", "stritt", "stritte", "gestritten", ""), // L615570
    verb("tragen", "trägst", "trägt", "trug", "trüge", "getragen", ""), // L501493
    verb(
        "treffen",
        "triffst",
        "trifft",
        "traf",
        "träfe",
        "getroffen",
        "triff",
    ), // L501511
    verb("treiben", "", "", "trieb", "triebe", "getrieben", ""), // L615548
    verb(
        "treten", "trittst", "tritt", "trat", "träte", "getreten", "tritt",
    ), // L477046
    verb("triefen", "", "", "troff", "tröffe", "getroffen", ""), // grammis 4074
    verb("trinken", "", "", "trank", "tränke", "getrunken", ""), // L36178
    verb("trügen", "", "", "trog", "tröge", "getrogen", ""), // L671926; past, subjunctive II, participle: grammis 4074
    verb("tun", "", "", "tat", "täte", "getan", ""),         // L302572
    verb(
        "verderben",
        "verdirbst",
        "verdirbt",
        "verdarb",
        "verdürbe",
        "verdorben",
        "verdirb",
    ), // L488281
    verb(
        "verdrießen",
        "",
        "",
        "verdross",
        "verdrösse",
        "verdrossen",
        "",
    ), // L881153
    verb(
        "vergessen",
        "vergisst",
        "vergisst",
        "vergaß",
        "vergäße",
        "vergessen",
        "vergiss",
    ), // L412870
    verb("verlieren", "", "", "verlor", "verlöre", "verloren", ""), // L501492
    verb(
        "wachsen",
        "wächst",
        "wächst",
        "wuchs",
        "wüchse",
        "gewachsen",
        "",
    ), // L594186,L594187
    verb(
        "waschen",
        "wäschst",
        "wäscht",
        "wusch",
        "wüsche",
        "gewaschen",
        "",
    ), // L313787
    verb("weben", "", "", "wob", "wöbe", "gewoben", ""),     // grammis 4074
    verb("weichen", "", "", "wich", "wiche", "gewichen", ""), // grammis 4074
    verb("weisen", "", "", "wies", "wiese", "gewiesen", ""), // L501502
    verb(
        "wenden",
        "wendest",
        "wendet",
        "wandte",
        "wendete",
        "gewandt",
        "wende/wend",
    ), // L671901; present 2sg, present 3sg, subjunctive II, participle, imperative: grammis 4073
    verb(
        "werben", "wirbst", "wirbt", "warb", "würbe", "geworben", "wirb",
    ), // L615558
    verb(
        "werden",
        "wirst",
        "wird",
        "wurde/ward",
        "würde",
        "geworden/worden",
        "werd/werde",
    ), // L297076; past, participle: grammis 4076
    verb(
        "werfen", "wirfst", "wirft", "warf", "würfe", "geworfen", "wirf",
    ), // L410981
    verb("wiegen", "", "", "wog", "wöge", "gewogen", ""),    // L1569179
    verb("winden", "", "", "wand", "wände", "gewunden", ""), // L937859
    verb(
        "wissen", "weißt", "weiß", "wusste", "wüsste", "gewusst", "wisse",
    ), // L2058
    verb(
        "wollen", "willst", "will", "wollte", "wollte", "gewollt", "",
    ), // L301557
    verb("wringen", "", "", "wrang", "wränge", "gewrungen", ""), // L867252
    verb("wägen", "", "", "wog", "wöge", "gewogen", ""),     // L819500
    verb("zeihen", "", "", "zieh", "ziehe", "geziehen", ""), // L615559
    verb("ziehen", "", "", "zog", "zöge", "gezogen", ""),    // L501486
    verb("zwingen", "", "", "zwang", "zwänge", "gezwungen", ""), // L671275; subjunctive II, participle: grammis 4074
];

/// Weak verbs that keep some strong forms: a stylistic past (frug), a strong participle (gesalzen), or both.
///
/// Source: grammis, unit 4074, tables 1 and 2.
pub(super) const WEAK_VERBS_WITH_STRONG_FORMS: [IrregularVerb; 8] = [
    verb("fragen", "", "", "frug", "", "", ""),
    verb("kreischen", "", "", "krisch", "", "gekrischen", ""),
    verb("löschen", "", "", "losch", "", "geloschen", ""),
    verb("mahlen", "", "", "", "", "gemahlen", ""),
    verb("salzen", "", "", "", "", "gesalzen", ""),
    verb("spalten", "", "", "", "", "gespalten", ""),
    verb("winken", "", "", "", "", "gewunken", ""),
    verb("stecken", "", "", "stak", "", "", ""),
];

const fn verb(
    infinitive: &'static str,
    present_2sg: &'static str,
    present_3sg: &'static str,
    past: &'static str,
    subjunctive_ii: &'static str,
    past_participle: &'static str,
    imperative_sg: &'static str,
) -> IrregularVerb {
    IrregularVerb {
        infinitive,
        present_2sg,
        present_3sg,
        past,
        subjunctive_ii,
        past_participle,
        imperative_sg,
    }
}
