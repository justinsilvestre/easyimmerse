//! The JSON columns of the collection row: settings, note types, decks and deck options, in the form genanki writes them.

use serde_json::{Map, Value, json};

use crate::note_type::AnkiNoteType;

/// The id of the deck Anki always has, named "Default".
const DEFAULT_DECK_ID: u64 = 1;
/// The id of the deck options that every deck in the package uses.
const DEFAULT_OPTIONS_ID: u64 = 1;
const LATEX_PREAMBLE: &str = "\\documentclass[12pt]{article}\n\\special{papersize=3in,5in}\n\\usepackage[utf8]{inputenc}\n\\usepackage{amssymb,amsmath}\n\\pagestyle{empty}\n\\setlength{\\parindent}{0in}\n\\begin{document}\n";

pub(crate) fn conf_json(note_type_id: u64, note_count: usize) -> String {
    json!({
        "activeDecks": [DEFAULT_DECK_ID],
        "addToCur": true,
        "collapseTime": 1200,
        "curDeck": DEFAULT_DECK_ID,
        "curModel": note_type_id.to_string(),
        "dueCounts": true,
        "estTimes": true,
        "newBury": true,
        "newSpread": 0,
        "nextPos": note_count + 1,
        "sortBackwards": false,
        "sortType": "noteFld",
        "timeLim": 0,
    })
    .to_string()
}

/// Writes the note type, which Anki calls a model. `modified_secs` decides whether a re-import replaces the user's copy.
pub(crate) fn models_json(note_type: &AnkiNoteType, deck_id: u64, modified_secs: u64) -> String {
    let fields: Vec<Value> = note_type
        .fields
        .iter()
        .enumerate()
        .map(|(ord, name)| {
            json!({"name": name, "ord": ord, "sticky": false, "rtl": false, "font": "Arial", "size": 20, "media": []})
        })
        .collect();
    let templates: Vec<Value> = note_type
        .templates
        .iter()
        .enumerate()
        .map(|(ord, template)| {
            json!({
                "name": template.name, "ord": ord, "qfmt": template.front, "afmt": template.back,
                "bqfmt": "", "bafmt": "", "bfont": "", "bsize": 0, "did": null,
            })
        })
        .collect();
    let model = json!({
        "id": note_type.id,
        "name": note_type.name,
        "type": 0,
        "mod": modified_secs,
        "usn": -1,
        "sortf": 0,
        "did": deck_id,
        "css": note_type.css,
        "latexPre": LATEX_PREAMBLE,
        "latexPost": "\\end{document}",
        "latexsvg": false,
        "flds": fields,
        "tmpls": templates,
        "req": required_fields(note_type),
        "tags": [],
        "vers": [],
    });
    keyed_by_id([(note_type.id, model)])
}

pub(crate) fn decks_json(deck_id: u64, deck_name: &str, modified_secs: u64) -> String {
    keyed_by_id([
        (
            DEFAULT_DECK_ID,
            deck(DEFAULT_DECK_ID, "Default", modified_secs),
        ),
        (deck_id, deck(deck_id, deck_name, modified_secs)),
    ])
}

pub(crate) fn dconf_json() -> String {
    let options = json!({
        "id": DEFAULT_OPTIONS_ID,
        "name": "Default",
        "mod": 0,
        "usn": 0,
        "dyn": false,
        "maxTaken": 60,
        "timer": 0,
        "autoplay": true,
        "replayq": true,
        "new": {
            "bury": true, "delays": [1, 10], "initialFactor": 2500, "ints": [1, 4, 7],
            "order": 1, "perDay": 20, "separate": true,
        },
        "rev": {
            "bury": true, "ease4": 1.3, "fuzz": 0.05, "ivlFct": 1, "maxIvl": 36500,
            "minSpace": 1, "perDay": 100,
        },
        "lapse": {"delays": [10], "leechAction": 0, "leechFails": 8, "minInt": 1, "mult": 0},
    });
    keyed_by_id([(DEFAULT_OPTIONS_ID, options)])
}

fn deck(id: u64, name: &str, modified_secs: u64) -> Value {
    json!({
        "id": id,
        "name": name,
        "mod": modified_secs,
        "usn": -1,
        "desc": "",
        "dyn": 0,
        "conf": DEFAULT_OPTIONS_ID,
        "collapsed": false,
        "browserCollapsed": false,
        "extendNew": 0,
        "extendRev": 50,
        "newToday": [0, 0],
        "revToday": [0, 0],
        "lrnToday": [0, 0],
        "timeToday": [0, 0],
    })
}

/// Lists, for each template, the fields whose values make its front non-empty, as older Anki versions expect.
fn required_fields(note_type: &AnkiNoteType) -> Value {
    let requirements: Vec<Value> = note_type
        .templates
        .iter()
        .enumerate()
        .map(|(ord, template)| {
            let field_ords: Vec<usize> = note_type
                .fields
                .iter()
                .enumerate()
                .filter(|(_, name)| template.front.contains(&format!("{{{{{name}}}}}")))
                .map(|(field_ord, _)| field_ord)
                .collect();
            json!([ord, "any", field_ords])
        })
        .collect();
    Value::Array(requirements)
}

fn keyed_by_id(entries: impl IntoIterator<Item = (u64, Value)>) -> String {
    let map: Map<String, Value> = entries
        .into_iter()
        .map(|(id, value)| (id.to_string(), value))
        .collect();
    Value::Object(map).to_string()
}
