use easyimmerse_media::{ContainerFormat, ContainerInfo, TrackKind};
use easyimmerse_media_ffmpeg::{FfmpegPaths, probe_file};

use crate::support::{ffprobe_available, fixture_path};

fn probe(name: &str) -> ContainerInfo {
    probe_file(&fixture_path(name), &FfmpegPaths::default()).expect("probe")
}

#[test]
fn probes_the_mp4_fixture() {
    if !ffprobe_available() {
        return;
    }
    assert_eq!(probe("sample.mp4").tracks.len(), 3);
}

#[test]
fn recognizes_each_container_format() {
    if !ffprobe_available() {
        return;
    }
    let fixtures = [
        ("conversion-h264-aac.mp4", ContainerFormat::Mp4),
        ("conversion-h264-aac.mkv", ContainerFormat::Matroska),
        ("conversion-h264-aac.ts", ContainerFormat::MpegTs),
        ("conversion-mpeg4-mp3.avi", ContainerFormat::Avi),
        ("conversion-tone.mp3", ContainerFormat::Mp3),
        ("conversion-tone.aac", ContainerFormat::Adts),
        ("conversion-tone.ogg", ContainerFormat::Ogg),
        ("conversion-tone.flac", ContainerFormat::Flac),
        ("conversion-tone.wav", ContainerFormat::Wav),
    ];
    let formats: Vec<ContainerFormat> = fixtures
        .iter()
        .map(|(name, _)| probe(name).format)
        .collect();
    let expected: Vec<ContainerFormat> = fixtures.iter().map(|(_, format)| *format).collect();
    assert_eq!(formats, expected);
}

#[test]
fn reads_languages_titles_and_default_flags_of_the_track_choice_fixture() {
    if !ffprobe_available() {
        return;
    }
    let described: Vec<(Option<String>, Option<String>, bool)> = probe("conversion-h264-aac.mkv")
        .tracks
        .into_iter()
        .filter(|track| track.kind == TrackKind::Audio)
        .map(|track| (track.language, track.title, track.is_default))
        .collect();
    assert_eq!(
        described,
        [
            (Some("jpn".to_owned()), Some("Japanese".to_owned()), true),
            (Some("eng".to_owned()), Some("English".to_owned()), false),
        ]
    );
}

#[test]
fn reads_the_interlaced_flag_from_the_field_order() {
    if !ffprobe_available() {
        return;
    }
    assert!(probe("conversion-interlaced-h264.mkv").tracks[0].interlaced);
}

#[test]
fn spells_the_hevc_codec_string() {
    if !ffprobe_available() {
        return;
    }
    assert_eq!(
        probe("conversion-hevc-aac.mp4").tracks[0]
            .codec_string
            .as_deref(),
        Some("hvc1.1.6.L60.B0")
    );
}

#[test]
fn reads_the_start_time_of_a_transport_stream() {
    if !ffprobe_available() {
        return;
    }
    let info = probe("conversion-h264-aac.ts");
    assert_eq!(
        (info.start_ms, info.tracks[0].start_ms),
        (Some(1459), Some(1480))
    );
}

#[test]
fn gives_vorbis_no_codec_string() {
    if !ffprobe_available() {
        return;
    }
    assert_eq!(
        probe("conversion-mpeg4-vorbis.mkv").tracks[1].codec_string,
        None
    );
}

#[test]
fn reads_the_overall_bit_rate() {
    if !ffprobe_available() {
        return;
    }
    assert!(
        probe("conversion-tone.wav")
            .bit_rate
            .is_some_and(|rate| rate > 250_000)
    );
}
