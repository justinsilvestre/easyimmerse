/// Converts a StarDict resource list (`r` field) into HTML that refers to the files.
///
/// Each line names one file in the dictionary's `res/` directory, prefixed by `img:`, `snd:`, `vdo:`, or `att:` for an image, sound, video, or attachment.
/// Lines with another prefix are skipped.
pub fn resource_list_html(list: &str) -> String {
    list.lines()
        .filter_map(resource_html)
        .collect::<Vec<_>>()
        .join("\n")
}

fn resource_html(line: &str) -> Option<String> {
    let (kind, path) = line.trim().split_once(':')?;
    let path = escape_html(path);
    match kind {
        "img" => Some(format!(r#"<img src="{path}">"#)),
        "snd" => Some(format!(r#"<audio controls src="{path}"></audio>"#)),
        "vdo" => Some(format!(r#"<video controls src="{path}"></video>"#)),
        "att" => Some(format!(r#"<a href="{path}">{path}</a>"#)),
        _ => None,
    }
}

fn escape_html(text: &str) -> String {
    text.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn turns_an_image_into_an_img_element() {
        assert_eq!(resource_list_html("img:cat.png"), r#"<img src="cat.png">"#);
    }

    #[test]
    fn turns_a_sound_into_an_audio_element() {
        assert_eq!(
            resource_list_html("snd:meow.wav"),
            r#"<audio controls src="meow.wav"></audio>"#
        );
    }

    #[test]
    fn puts_each_resource_on_its_own_line() {
        assert_eq!(
            resource_list_html("img:a.png\nimg:b.png"),
            "<img src=\"a.png\">\n<img src=\"b.png\">"
        );
    }

    #[test]
    fn escapes_the_path() {
        assert_eq!(
            resource_list_html(r#"img:a"b.png"#),
            r#"<img src="a&quot;b.png">"#
        );
    }

    #[test]
    fn skips_unknown_resource_kinds() {
        assert_eq!(resource_list_html("xyz:a.bin"), "");
    }
}
