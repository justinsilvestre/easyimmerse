//! Codec strings for H.264, also called AVC.
//! The string `avc1.PPCCLL` holds three bytes in hexadecimal: the profile number, the constraint flags, and the level number.

/// Returns the codec string for H.264 from the three bytes that the stream's configuration record stores.
pub fn avc_codec_string(profile_idc: u8, constraint_flags: u8, level_idc: u8) -> String {
    format!("avc1.{profile_idc:02X}{constraint_flags:02X}{level_idc:02X}")
}

/// Rewrites an H.264 codec string reported by another tool as `avc1.` followed by uppercase hexadecimal.
/// An `avc3` string becomes `avc1` because fragmented MP4 output stores H.264 under the `avc1` sample entry.
/// Returns `None` when the string is not a valid H.264 codec string.
pub fn normalize_avc_codec_string(reported: &str) -> Option<String> {
    let hex = reported
        .strip_prefix("avc1.")
        .or_else(|| reported.strip_prefix("avc3."))?;
    if hex.len() != 6 || !hex.bytes().all(|byte| byte.is_ascii_hexdigit()) {
        return None;
    }
    let value = u32::from_str_radix(hex, 16).ok()?;
    let [_, profile_idc, constraint_flags, level_idc] = value.to_be_bytes();
    Some(avc_codec_string(profile_idc, constraint_flags, level_idc))
}

/// Derives the codec string from ffprobe's profile name when the stream's own bytes are unavailable.
/// The constraint flags are the usual ones for each profile, so they may differ from the stream's own flags.
pub(crate) fn avc_codec_string_for_profile(profile: &str, level: u32) -> Option<String> {
    let (profile_idc, constraint_flags) = avc_profile_bytes(profile)?;
    Some(avc_codec_string(
        profile_idc,
        constraint_flags,
        u8::try_from(level).ok()?,
    ))
}

fn avc_profile_bytes(profile: &str) -> Option<(u8, u8)> {
    match profile {
        "Constrained Baseline" => Some((0x42, 0xE0)),
        "Baseline" => Some((0x42, 0x00)),
        "Main" => Some((0x4D, 0x40)),
        "Extended" => Some((0x58, 0x00)),
        "High" => Some((0x64, 0x00)),
        "High 10" => Some((0x6E, 0x00)),
        "High 4:2:2" => Some((0x7A, 0x00)),
        "High 4:4:4 Predictive" => Some((0xF4, 0x00)),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn writes_each_byte_as_two_uppercase_hex_digits() {
        assert_eq!(avc_codec_string(0x64, 0x00, 0x0C), "avc1.64000C");
    }

    #[test]
    fn uppercases_a_reported_codec_string() {
        assert_eq!(
            normalize_avc_codec_string("avc1.42c00d").as_deref(),
            Some("avc1.42C00D")
        );
    }

    #[test]
    fn rewrites_a_reported_avc3_codec_string_as_avc1() {
        assert_eq!(
            normalize_avc_codec_string("avc3.64001f").as_deref(),
            Some("avc1.64001F")
        );
    }

    #[test]
    fn rejects_a_reported_codec_string_with_too_few_digits() {
        assert_eq!(normalize_avc_codec_string("avc1.6400"), None);
    }

    #[test]
    fn rejects_a_reported_codec_string_that_is_not_hex() {
        assert_eq!(normalize_avc_codec_string("avc1.64zz1f"), None);
    }

    #[test]
    fn rejects_a_reported_codec_string_for_another_codec() {
        assert_eq!(normalize_avc_codec_string("mp4a.40.2"), None);
    }

    #[test]
    fn derives_constrained_baseline_flags() {
        assert_eq!(
            avc_codec_string_for_profile("Constrained Baseline", 30).as_deref(),
            Some("avc1.42E01E")
        );
    }

    #[test]
    fn derives_main_profile_flags() {
        assert_eq!(
            avc_codec_string_for_profile("Main", 40).as_deref(),
            Some("avc1.4D4028")
        );
    }

    #[test]
    fn rejects_an_unknown_profile() {
        assert_eq!(avc_codec_string_for_profile("Multiview High", 40), None);
    }

    #[test]
    fn rejects_a_level_above_one_byte() {
        assert_eq!(avc_codec_string_for_profile("High", 256), None);
    }
}
