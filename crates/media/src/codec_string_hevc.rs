//! Codec strings for H.265, also called HEVC.
//! The string `hvc1.P.C.TLL.B` has four dot-separated parts.
//! `P` is the profile number, and `C` is the profile compatibility flags in hexadecimal with their bit order reversed.
//! `T` is the tier (`L` for Main, `H` for High), and `LL` is the level number, which is 30 times the level, for example 93 for level 3.1.
//! `B` is the constraint flags in hexadecimal.

/// Derives the codec string from ffprobe's profile name and level number.
/// ffprobe does not report the tier or the constraint flags, so this assumes the Main tier and progressive, non-interlaced frames.
/// Returns `None` for profiles other than Main and Main 10.
pub(crate) fn hevc_codec_string(profile: &str, level: u32) -> Option<String> {
    let profile_and_compatibility = match profile {
        "Main" => "1.6",
        "Main 10" => "2.4",
        _ => return None,
    };
    Some(format!("hvc1.{profile_and_compatibility}.L{level}.B0"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn describes_main_profile() {
        assert_eq!(
            hevc_codec_string("Main", 120).as_deref(),
            Some("hvc1.1.6.L120.B0")
        );
    }

    #[test]
    fn describes_main_10_profile() {
        assert_eq!(
            hevc_codec_string("Main 10", 150).as_deref(),
            Some("hvc1.2.4.L150.B0")
        );
    }

    #[test]
    fn rejects_the_range_extensions_profile() {
        assert_eq!(hevc_codec_string("Rext", 93), None);
    }
}
