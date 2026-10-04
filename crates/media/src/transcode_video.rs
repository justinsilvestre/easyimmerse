//! The picture size and bit rate of transcoded video.

use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;

use crate::rational::Rational;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct PictureSize {
    pub width: u32,
    pub height: u32,
}

/// The hardware encoder rejects narrow pictures at heights under 480, so anything narrower
/// than this is scaled up to this width.
const MIN_WIDTH: u32 = 640;
/// The hardware encoder's widest picture; wider sources are scaled down to it.
const MAX_WIDTH: u32 = 4096;
/// The hardware encoder's tallest picture.
const MAX_HEIGHT: u32 = 4080;

const BITS_PER_PIXEL_PER_SECOND: u64 = 3;
const HIGH_FRAME_RATE_THRESHOLD: Rational = Rational::new(30, 1);
const MIN_BIT_RATE: u64 = 1_000_000;

/// The size to scale a picture to before encoding, or `None` to keep the source size.
/// Pictures narrower than 640 px are scaled up to 640 wide and pictures wider than 4096 px are
/// scaled down to 4096 wide, both keeping the aspect ratio with an even height. A resulting
/// height over 4080 px is refused, since the encoder cannot produce it.
pub fn fit_picture(source: PictureSize) -> Result<Option<PictureSize>, PictureTooTall> {
    let scaled = if source.width < MIN_WIDTH {
        Some(scale_to_width(source, MIN_WIDTH))
    } else if source.width > MAX_WIDTH {
        Some(scale_to_width(source, MAX_WIDTH))
    } else {
        None
    };
    if scaled.unwrap_or(source).height > MAX_HEIGHT {
        return Err(PictureTooTall);
    }
    Ok(scaled)
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct PictureTooTall;

fn scale_to_width(source: PictureSize, width: u32) -> PictureSize {
    let exact_height = u64::from(source.height) * u64::from(width) / u64::from(source.width.max(1));
    PictureSize {
        width,
        height: (exact_height as u32).div_ceil(2) * 2,
    }
}

/// The bit rate for transcoded video: 3 bits per pixel per second (about 6.2 Mbps at 1080p and
/// 2.8 Mbps at 720p), one and a half times that above 30 frames per second, at least 1 Mbps,
/// and never above the source's own bit rate. Without a picture size only the floor applies.
pub fn transcode_bit_rate(
    picture: Option<PictureSize>,
    frame_rate: Option<Rational>,
    source_bit_rate: Option<u64>,
) -> u64 {
    let pixels = picture.map_or(0, |size| u64::from(size.width) * u64::from(size.height));
    let mut bit_rate = pixels * BITS_PER_PIXEL_PER_SECOND;
    if frame_rate.is_some_and(|rate| rate.is_greater_than(HIGH_FRAME_RATE_THRESHOLD)) {
        bit_rate = bit_rate * 3 / 2;
    }
    bit_rate = bit_rate.max(MIN_BIT_RATE);
    source_bit_rate.map_or(bit_rate, |source| bit_rate.min(source))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn size(width: u32, height: u32) -> PictureSize {
        PictureSize { width, height }
    }

    #[test]
    fn keeps_a_720p_picture() {
        assert_eq!(fit_picture(size(1280, 720)), Ok(None));
    }

    #[test]
    fn scales_a_narrow_picture_up_to_640_wide() {
        assert_eq!(fit_picture(size(320, 180)), Ok(Some(size(640, 360))));
    }

    #[test]
    fn scales_a_wide_picture_down_to_4096_wide() {
        assert_eq!(fit_picture(size(7680, 4320)), Ok(Some(size(4096, 2304))));
    }

    #[test]
    fn rounds_a_scaled_height_up_to_an_even_number() {
        assert_eq!(fit_picture(size(427, 240)), Ok(Some(size(640, 360))));
    }

    #[test]
    fn refuses_a_picture_that_scales_taller_than_4080() {
        assert_eq!(fit_picture(size(4320, 7680)), Err(PictureTooTall));
    }

    #[test]
    fn gives_1080p_about_6_megabits() {
        assert_eq!(
            transcode_bit_rate(Some(size(1920, 1080)), None, None),
            6_220_800
        );
    }

    #[test]
    fn gives_720p_about_3_megabits() {
        assert_eq!(
            transcode_bit_rate(Some(size(1280, 720)), None, None),
            2_764_800
        );
    }

    #[test]
    fn raises_the_rate_by_half_above_30_frames_per_second() {
        assert_eq!(
            transcode_bit_rate(Some(size(1280, 720)), Some(Rational::new(60, 1)), None),
            4_147_200
        );
    }

    #[test]
    fn keeps_the_rate_at_exactly_30_frames_per_second() {
        assert_eq!(
            transcode_bit_rate(Some(size(1280, 720)), Some(Rational::new(30, 1)), None),
            2_764_800
        );
    }

    #[test]
    fn floors_small_pictures_at_1_megabit() {
        assert_eq!(
            transcode_bit_rate(Some(size(640, 360)), None, None),
            1_000_000
        );
    }

    #[test]
    fn never_exceeds_the_source_bit_rate() {
        assert_eq!(
            transcode_bit_rate(Some(size(1920, 1080)), None, Some(2_500_000)),
            2_500_000
        );
    }

    #[test]
    fn uses_the_floor_without_a_picture_size() {
        assert_eq!(transcode_bit_rate(None, None, None), 1_000_000);
    }
}
