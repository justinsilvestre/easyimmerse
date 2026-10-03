//! H.264 (AVC) profile naming and codec strings.

/// The `avc1.PPCCLL` string: profile, constraint flags, and level as two hex digits each.
pub fn avc_codec_string(profile_idc: u8, constraint_flags: u8, level_idc: u8) -> String {
    format!("avc1.{profile_idc:02X}{constraint_flags:02X}{level_idc:02X}")
}

/// The profile indication and constraint flags behind one of ffmpeg's H.264 profile names.
/// The flags are the common values for the profile, since ffprobe does not report them.
pub fn avc_profile_parameters(profile: &str) -> Option<(u8, u8)> {
    Some(match profile {
        "Baseline" => (66, 0x00),
        "Constrained Baseline" => (66, 0xE0),
        "Main" => (77, 0x40),
        "Extended" => (88, 0x00),
        "High" => (100, 0x00),
        "Constrained High" => (100, 0x0C),
        "High 10" => (110, 0x00),
        "High 10 Intra" => (110, 0x10),
        "High 4:2:2" => (122, 0x00),
        "High 4:2:2 Intra" => (122, 0x10),
        "High 4:4:4 Predictive" => (244, 0x00),
        "High 4:4:4 Intra" => (244, 0x10),
        "CAVLC 4:4:4" => (44, 0x00),
        _ => return None,
    })
}

/// ffmpeg's name for the profile described by a profile indication and constraint flags.
pub fn avc_profile_name(profile_idc: u8, constraint_flags: u8) -> Option<&'static str> {
    let constraint_set1 = constraint_flags & 0x40 != 0;
    let constraint_set3 = constraint_flags & 0x10 != 0;
    Some(match (profile_idc, constraint_set1, constraint_set3) {
        (66, true, _) => "Constrained Baseline",
        (66, false, _) => "Baseline",
        (77, _, _) => "Main",
        (88, _, _) => "Extended",
        (100, true, _) if constraint_flags & 0x0C == 0x0C => "Constrained High",
        (100, _, _) => "High",
        (110, _, true) => "High 10 Intra",
        (110, _, false) => "High 10",
        (122, _, true) => "High 4:2:2 Intra",
        (122, _, false) => "High 4:2:2",
        (244, _, true) => "High 4:4:4 Intra",
        (244, _, false) => "High 4:4:4 Predictive",
        (44, _, _) => "CAVLC 4:4:4",
        _ => return None,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn formats_each_byte_as_two_uppercase_hex_digits() {
        assert_eq!(avc_codec_string(100, 0, 12), "avc1.64000C");
    }

    #[test]
    fn names_baseline_with_constraint_set_1_as_constrained() {
        assert_eq!(avc_profile_name(66, 0xC0), Some("Constrained Baseline"));
    }

    #[test]
    fn names_profile_100_high() {
        assert_eq!(avc_profile_name(100, 0), Some("High"));
    }

    #[test]
    fn names_profile_110_high_10() {
        assert_eq!(avc_profile_name(110, 0), Some("High 10"));
    }

    #[test]
    fn knows_no_name_for_an_unknown_profile() {
        assert_eq!(avc_profile_name(1, 0), None);
    }

    #[test]
    fn round_trips_the_main_profile() {
        let (idc, flags) = avc_profile_parameters("Main").expect("known profile");
        assert_eq!(avc_profile_name(idc, flags), Some("Main"));
    }
}
