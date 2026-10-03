//! HEVC (H.265) codec strings.

/// The `hvc1` string for one of ffmpeg's HEVC profile names and a general level indication
/// (thirty times the level number, so level 4.0 is 120). ffprobe reports neither the tier nor
/// the constraint flags, so the string assumes the Main tier and progressive, frame-only content
/// (`B0`), which is what nearly every file carries.
pub fn hevc_codec_string(profile: &str, level_idc: u16) -> Option<String> {
    let (profile_idc, compatibility_flags) = match profile {
        "Main" => (1, "6"),
        "Main 10" => (2, "4"),
        "Main Still Picture" => (3, "E"),
        "Rext" => (4, "10"),
        _ => return None,
    };
    Some(format!(
        "hvc1.{profile_idc}.{compatibility_flags}.L{level_idc}.B0"
    ))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn spells_main_level_3_1() {
        assert_eq!(
            hevc_codec_string("Main", 93).as_deref(),
            Some("hvc1.1.6.L93.B0")
        );
    }

    #[test]
    fn spells_main_10_level_5_1() {
        assert_eq!(
            hevc_codec_string("Main 10", 153).as_deref(),
            Some("hvc1.2.4.L153.B0")
        );
    }

    #[test]
    fn knows_no_string_for_an_unknown_profile() {
        assert_eq!(hevc_codec_string("Scalable Main", 93), None);
    }
}
