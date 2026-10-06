//! Running yt-dlp through the bundled `youtube` script, and reading what it prints.

use std::collections::BTreeMap;

use serde::Deserialize;

use crate::easyimmerse::plugin::{run_command, types::PluginError};

/// The bundled script that runs yt-dlp.
const COMMAND: &str = "youtube";

/// MP4 video up to 720p with M4A audio, merged by ffmpeg; else the best single MP4 file,
/// which YouTube offers at 360p; else whatever is best.
const FORMAT: &str = "bv*[ext=mp4][height<=720]+ba[ext=m4a]/b[ext=mp4]/b";

/// What yt-dlp reports about a video before downloading it.
pub struct Description {
    pub title: String,
    pub duration_ms: Option<u64>,
    pub webpage_url: String,
    /// The languages of the subtitles the uploader provided.
    pub subtitle_languages: Vec<String>,
    /// The languages of the automatic captions, as yt-dlp names them: the original
    /// language carries an `-orig` suffix, the translations do not.
    pub caption_languages: Vec<String>,
}

/// A subtitle file yt-dlp wrote, keyed by the language it was requested as.
#[derive(Deserialize)]
pub struct WrittenSubtitle {
    pub filepath: Option<String>,
    #[serde(default)]
    pub url: String,
}

pub struct Download {
    pub media_path: String,
    pub subtitles: BTreeMap<String, WrittenSubtitle>,
}

/// The keys of a captions object, with the values skipped: the values list every format
/// of every language, which would be a lot to parse for nothing.
#[derive(Deserialize)]
struct LanguageKeys(BTreeMap<String, serde::de::IgnoredAny>);

pub fn describe(url: &str) -> Result<Description, PluginError> {
    let output = run(&[
        "--no-playlist",
        "--skip-download",
        "--print",
        "%(title)s",
        "--print",
        "%(duration)s",
        "--print",
        "%(webpage_url)s",
        "--print",
        "%(subtitles)j",
        "--print",
        "%(automatic_captions)j",
        url,
    ])?;
    let mut lines = output.lines();
    let mut next = |what: &str| {
        lines
            .next()
            .map(str::to_string)
            .ok_or_else(|| PluginError::Other(format!("yt-dlp printed no {what}")))
    };
    let title = next("title")?;
    let duration = next("duration")?;
    let webpage_url = next("URL")?;
    let subtitles = next("subtitles")?;
    let captions = next("automatic captions")?;
    Ok(Description {
        title,
        duration_ms: parse_duration_ms(&duration),
        webpage_url,
        subtitle_languages: parse_language_keys(&subtitles, "subtitles")?,
        caption_languages: parse_language_keys(&captions, "automatic captions")?,
    })
}

/// Downloads the video as `media.<ext>` into `output_dir`, with the subtitles in
/// `languages` beside it as `media.<language>.vtt`, and returns where the files landed.
pub fn download(
    url: &str,
    output_dir: &str,
    languages: &[String],
) -> Result<Download, PluginError> {
    let output_template = format!("{output_dir}/media.%(ext)s");
    let languages = languages.join(",");
    let mut args = vec![
        "--no-playlist",
        "-f",
        FORMAT,
        "--merge-output-format",
        "mp4",
        "-o",
        &output_template,
    ];
    if !languages.is_empty() {
        args.extend([
            "--write-subs",
            "--write-auto-subs",
            "--sub-langs",
            &languages,
            "--sub-format",
            "vtt",
        ]);
    }
    args.extend([
        "--print",
        "after_move:filepath",
        "--print",
        "after_move:%(requested_subtitles)j",
        url,
    ]);
    let output = run(&args)?;
    let mut lines = output.lines();
    let media_path = lines
        .next()
        .filter(|line| !line.is_empty())
        .ok_or_else(|| PluginError::Other("yt-dlp printed no file path".to_string()))?
        .to_string();
    let subtitles: Option<BTreeMap<String, WrittenSubtitle>> =
        serde_json::from_str(lines.next().unwrap_or("null"))
            .map_err(|error| PluginError::Other(format!("yt-dlp's subtitles report: {error}")))?;
    Ok(Download {
        media_path,
        subtitles: subtitles.unwrap_or_default(),
    })
}

fn run(args: &[&str]) -> Result<String, PluginError> {
    let args: Vec<String> = args.iter().map(|arg| arg.to_string()).collect();
    let output = run_command::run(COMMAND, &args)?;
    if output.exit_code == 0 {
        return Ok(output.stdout);
    }
    let message = output
        .stderr
        .lines()
        .rev()
        .find(|line| line.starts_with("ERROR:"))
        .unwrap_or("yt-dlp failed without an error message")
        .to_string();
    if message.contains("is not a valid URL") || message.contains("Unsupported URL") {
        Err(PluginError::InvalidInput(message))
    } else {
        Err(PluginError::Other(message))
    }
}

/// yt-dlp prints `NA` for a missing duration, and seconds with a fraction otherwise.
fn parse_duration_ms(text: &str) -> Option<u64> {
    let seconds: f64 = text.trim().parse().ok()?;
    Some((seconds * 1000.0).round() as u64)
}

/// yt-dlp prints `null` for a missing captions object.
fn parse_language_keys(json: &str, what: &str) -> Result<Vec<String>, PluginError> {
    let keys: Option<LanguageKeys> = serde_json::from_str(json)
        .map_err(|error| PluginError::Other(format!("yt-dlp's {what} report: {error}")))?;
    Ok(keys
        .map(|keys| keys.0.into_keys().collect())
        .unwrap_or_default())
}
