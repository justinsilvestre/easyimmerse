//! Conversion of term meta bank rows, `[term, mode, data]`, into term meta.

use serde::Deserialize;
use serde_json::Value;

use super::super::term_meta::{
    IpaTranscription, PitchAccent, PitchPosition, TermMeta, TermMetaData,
};
use super::frequency::frequency;

pub type TermMetaRow = (String, String, Value);

/// Converts one row, or returns `None` when its mode is unknown or its data does not fit the mode.
pub fn term_meta((term, mode, data): TermMetaRow) -> Option<TermMeta> {
    let (reading, data) = match mode.as_str() {
        "freq" => frequency_data(&data)?,
        "pitch" => pitch_data(data)?,
        "ipa" => ipa_data(data)?,
        _ => return None,
    };
    Some(TermMeta {
        term,
        reading,
        data,
    })
}

/// Reads a frequency, which may be restricted to one reading with `{reading, frequency}`.
fn frequency_data(data: &Value) -> Option<(Option<String>, TermMetaData)> {
    let reading = data.get("reading").and_then(Value::as_str);
    let value = match reading {
        Some(_) => data.get("frequency")?,
        None => data,
    };
    Some((
        reading.map(String::from),
        TermMetaData::Frequency(frequency(value)?),
    ))
}

fn pitch_data(data: Value) -> Option<(Option<String>, TermMetaData)> {
    let pitch = PitchData::deserialize(data).ok()?;
    let pitches = pitch.pitches.into_iter().map(PitchAccent::from).collect();
    Some((Some(pitch.reading), TermMetaData::Pitch { pitches }))
}

fn ipa_data(data: Value) -> Option<(Option<String>, TermMetaData)> {
    let ipa = IpaData::deserialize(data).ok()?;
    let transcriptions = ipa
        .transcriptions
        .into_iter()
        .map(IpaTranscription::from)
        .collect();
    Some((Some(ipa.reading), TermMetaData::Ipa { transcriptions }))
}

#[derive(Deserialize)]
struct PitchData {
    reading: String,
    pitches: Vec<Pitch>,
}

#[derive(Deserialize)]
struct Pitch {
    position: PitchPosition,
    #[serde(default)]
    nasal: MoraPositions,
    #[serde(default)]
    devoice: MoraPositions,
    #[serde(default)]
    tags: Vec<String>,
}

/// Mora positions, given either as one number or as a list.
#[derive(Default, Deserialize)]
#[serde(untagged)]
enum MoraPositions {
    #[default]
    None,
    One(u32),
    Many(Vec<u32>),
}

#[derive(Deserialize)]
struct IpaData {
    reading: String,
    transcriptions: Vec<Transcription>,
}

#[derive(Deserialize)]
struct Transcription {
    ipa: String,
    #[serde(default)]
    tags: Vec<String>,
}

impl From<Pitch> for PitchAccent {
    fn from(pitch: Pitch) -> Self {
        Self {
            position: pitch.position,
            nasal: pitch.nasal.into(),
            devoice: pitch.devoice.into(),
            tags: pitch.tags,
        }
    }
}

impl From<MoraPositions> for Vec<u32> {
    fn from(positions: MoraPositions) -> Self {
        match positions {
            MoraPositions::None => Vec::new(),
            MoraPositions::One(position) => vec![position],
            MoraPositions::Many(positions) => positions,
        }
    }
}

impl From<Transcription> for IpaTranscription {
    fn from(transcription: Transcription) -> Self {
        Self {
            ipa: transcription.ipa,
            tags: transcription.tags,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::dictionary::Frequency;
    use serde_json::json;

    fn meta(mode: &str, data: Value) -> Option<TermMeta> {
        term_meta(("猫".into(), mode.into(), data))
    }

    fn pitches(data: Value) -> Vec<PitchAccent> {
        match meta("pitch", data).unwrap().data {
            TermMetaData::Pitch { pitches } => pitches,
            other => panic!("expected pitch data, got {other:?}"),
        }
    }

    #[test]
    fn reads_a_frequency_for_every_reading() {
        assert_eq!(meta("freq", json!(120)).unwrap().reading, None);
    }

    #[test]
    fn reads_the_value_of_a_frequency() {
        assert_eq!(
            meta("freq", json!(120)).unwrap().data,
            TermMetaData::Frequency(Frequency {
                value: Some(120.0),
                display: None,
            })
        );
    }

    #[test]
    fn reads_the_reading_of_a_restricted_frequency() {
        let data = json!({"reading": "ねこ", "frequency": {"value": 5, "displayValue": "5"}});
        assert_eq!(meta("freq", data).unwrap().reading.as_deref(), Some("ねこ"));
    }

    #[test]
    fn reads_the_value_of_a_restricted_frequency() {
        let data = json!({"reading": "ねこ", "frequency": 5});
        assert_eq!(
            meta("freq", data).unwrap().data,
            TermMetaData::Frequency(Frequency {
                value: Some(5.0),
                display: None,
            })
        );
    }

    #[test]
    fn reads_the_reading_of_a_pitch() {
        let data = json!({"reading": "ねこ", "pitches": [{"position": 1}]});
        assert_eq!(
            meta("pitch", data).unwrap().reading.as_deref(),
            Some("ねこ")
        );
    }

    #[test]
    fn reads_a_downstep_position() {
        let data = json!({"reading": "ねこ", "pitches": [{"position": 1}]});
        assert_eq!(pitches(data)[0].position, PitchPosition::Downstep(1));
    }

    #[test]
    fn reads_a_pattern_position() {
        let data = json!({"reading": "ねこ", "pitches": [{"position": "HL"}]});
        assert_eq!(
            pitches(data)[0].position,
            PitchPosition::Pattern("HL".into())
        );
    }

    #[test]
    fn reads_a_single_nasal_position_as_a_list() {
        let data = json!({"reading": "ねこ", "pitches": [{"position": 1, "nasal": 2}]});
        assert_eq!(pitches(data)[0].nasal, vec![2]);
    }

    #[test]
    fn reads_devoiced_positions() {
        let data = json!({"reading": "ねこ", "pitches": [{"position": 1, "devoice": [1, 2]}]});
        assert_eq!(pitches(data)[0].devoice, vec![1, 2]);
    }

    #[test]
    fn reads_the_tags_of_a_pitch() {
        let data = json!({"reading": "ねこ", "pitches": [{"position": 1, "tags": ["n"]}]});
        assert_eq!(pitches(data)[0].tags, vec!["n"]);
    }

    #[test]
    fn reads_ipa_transcriptions() {
        let data =
            json!({"reading": "ねこ", "transcriptions": [{"ipa": "neko", "tags": ["Tokyo"]}]});
        assert_eq!(
            meta("ipa", data).unwrap().data,
            TermMetaData::Ipa {
                transcriptions: vec![IpaTranscription {
                    ipa: "neko".into(),
                    tags: vec!["Tokyo".into()],
                }]
            }
        );
    }

    #[test]
    fn rejects_an_unknown_mode() {
        assert_eq!(meta("color", json!(1)), None);
    }

    #[test]
    fn rejects_a_pitch_without_a_reading() {
        assert_eq!(meta("pitch", json!({"pitches": []})), None);
    }
}
