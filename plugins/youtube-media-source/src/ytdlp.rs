//! Running yt-dlp through the bundled `youtube` script, and reading what it prints.
//!
//! Each command asks yt-dlp to print one JSON object with every field the plugin needs,
//! so that the answer does not depend on how many lines yt-dlp writes before it, such as
//! download progress. A field yt-dlp has no value for is left out of the object, where a
//! separate `--print` of it would have printed `NA`.

use std::collections::BTreeMap;

use serde::Deserialize;

use crate::easyimmerse::plugin::{run_command, types::PluginError};

/// The bundled script that runs yt-dlp.
const COMMAND: &str = "youtube";

/// MP4 video up to 720p with M4A audio, merged by ffmpeg; else the best single MP4 file,
/// which YouTube offers at 360p; else whatever is best.
pub const FORMAT: &str = "bv*[ext=mp4][height<=720]+ba[ext=m4a]/b[ext=mp4]/b";

/// What yt-dlp reports about a video before downloading it.
#[derive(Deserialize)]
pub struct Description {
    #[serde(default)]
    pub title: String,
    /// Seconds, possibly with a fraction.
    #[serde(default)]
    pub duration: Option<f64>,
    #[serde(default)]
    pub webpage_url: String,
    /// The subtitles the uploader provided, by language.
    #[serde(default)]
    pub subtitles: LanguageKeys,
    /// The automatic captions, by language as yt-dlp names them: the original language
    /// carries an `-orig` suffix, the translations do not.
    #[serde(default)]
    pub automatic_captions: LanguageKeys,
}

impl Description {
    pub fn duration_ms(&self) -> Option<u64> {
        self.duration
            .map(|seconds| (seconds * 1000.0).round() as u64)
    }
}

/// The keys of a captions object, with the values skipped: the values list every format
/// of every language, which would be a lot to parse for nothing.
#[derive(Default, Deserialize)]
pub struct LanguageKeys(pub BTreeMap<String, serde::de::IgnoredAny>);

impl LanguageKeys {
    pub fn languages(&self) -> impl Iterator<Item = &str> {
        self.0.keys().map(String::as_str)
    }
}

/// A subtitle file yt-dlp wrote, keyed by the language it was requested as.
#[derive(Deserialize)]
pub struct WrittenSubtitle {
    pub filepath: Option<String>,
    #[serde(default)]
    pub url: String,
}

#[derive(Deserialize)]
pub struct Download {
    /// Where the media file landed after any merging.
    pub filepath: String,
    #[serde(default)]
    pub requested_subtitles: Option<BTreeMap<String, WrittenSubtitle>>,
}

/// The version of yt-dlp the script runs, for the log.
pub fn version() -> Result<String, PluginError> {
    let output = run(&["--version"])?;
    Ok(output.trim().to_string())
}

pub fn describe(url: &str) -> Result<Description, PluginError> {
    let output = run(&[
        "--no-playlist",
        "--skip-download",
        "--print",
        "%(.{title,duration,webpage_url,subtitles,automatic_captions})j",
        url,
    ])?;
    parse_report(&output, "the video's description")
}

/// Downloads the video as `media.<ext>` into `output_dir`, with the subtitles in
/// `languages` beside it as `media.<language>.vtt`, and returns where the files landed.
/// yt-dlp reports its progress line by line, which the host passes on as it arrives.
pub fn download(
    url: &str,
    output_dir: &str,
    languages: &[String],
) -> Result<Download, PluginError> {
    let output_template = format!("{output_dir}/media.%(ext)s");
    let languages = languages.join(",");
    let mut args = vec![
        "--no-playlist",
        "--progress",
        "--newline",
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
        "after_move:%(.{filepath,requested_subtitles})j",
        url,
    ]);
    let output = run(&args)?;
    parse_report(&output, "the download")
}

/// Reads the JSON object yt-dlp printed: the last line that is one. Anything else on
/// standard output, such as progress, comes before it.
fn parse_report<T: serde::de::DeserializeOwned>(
    stdout: &str,
    what: &str,
) -> Result<T, PluginError> {
    let Some(line) = stdout.lines().rev().find(|line| line.starts_with('{')) else {
        return Err(PluginError::Other(format!(
            "yt-dlp printed no report of {what}; its output ended with: {}",
            last_lines(stdout)
        )));
    };
    serde_json::from_str(line).map_err(|error| {
        PluginError::Other(format!(
            "yt-dlp's report of {what} could not be read ({error}); it was: {}",
            excerpt(line)
        ))
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
        .map(str::to_string)
        .unwrap_or_else(|| {
            format!(
                "yt-dlp failed with exit code {} without an error message; its output ended with: {}",
                output.exit_code,
                last_lines(&output.stderr)
            )
        });
    if message.contains("is not a valid URL") || message.contains("Unsupported URL") {
        Err(PluginError::InvalidInput(message))
    } else {
        Err(PluginError::Other(with_hint(message, &output.stderr)))
    }
}

/// Adds what to do about a failure whose cause lies in the yt-dlp installation rather
/// than in the video, which yt-dlp's own message does not say.
fn with_hint(message: String, stderr: &str) -> String {
    if message.contains("HTTP Error 403") {
        let impersonation = if stderr.contains("no impersonate target is available") {
            " and it could not impersonate a browser, which this video needed (install \
             curl_cffi: pip install \"yt-dlp[default,curl-cffi]\")"
        } else {
            ""
        };
        format!(
            "{message} (YouTube refused the stream to this yt-dlp; this usually means \
             yt-dlp is out of date{impersonation}; update it and try again)"
        )
    } else {
        message
    }
}

/// The last few lines of a command's output, for an error message.
fn last_lines(text: &str) -> String {
    let lines: Vec<&str> = text
        .lines()
        .filter(|line| !line.trim().is_empty())
        .collect();
    let tail = &lines[lines.len().saturating_sub(3)..];
    if tail.is_empty() {
        "nothing".to_string()
    } else {
        format!("{tail:?}")
    }
}

fn excerpt(line: &str) -> String {
    const LIMIT: usize = 200;
    if line.len() <= LIMIT {
        line.to_string()
    } else {
        let end = line
            .char_indices()
            .map(|(index, _)| index)
            .take_while(|index| *index <= LIMIT)
            .last()
            .unwrap_or(0);
        format!("{}…", &line[..end])
    }
}
