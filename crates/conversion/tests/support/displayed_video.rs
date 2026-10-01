//! Which decoded frame a player shows at a given time.

use super::source_media::FRAME_WIDTH;

/// Decoded frames with their presentation times, both in presentation order.
pub struct DisplayedVideo {
    presentation_us: Vec<i64>,
    frames: Vec<Vec<u8>>,
}

impl DisplayedVideo {
    /// Pairs frames decoded in presentation order with the presentation times of their packets, in any order.
    pub fn new(mut presentation_us: Vec<i64>, frames: Vec<Vec<u8>>) -> Self {
        presentation_us.sort_unstable();
        assert_eq!(presentation_us.len(), frames.len(), "one frame per packet");
        DisplayedVideo {
            presentation_us,
            frames,
        }
    }

    /// Returns the frame a player shows at the time: the last frame whose presentation time is not after it.
    pub fn frame_at(&self, time_us: f64) -> &[u8] {
        let shown = self
            .presentation_us
            .partition_point(|&start| start as f64 <= time_us);
        &self.frames[shown.checked_sub(1).expect("a frame starts by then")]
    }
}

/// Reads the index that a frame of the fixture shows as 16 black or white columns, one bit each, in the luma plane.
pub fn shown_frame_index(frame: &[u8]) -> u32 {
    const ROW: usize = 18;
    (0..16)
        .filter(|bit| frame[ROW * FRAME_WIDTH + 8 * bit + 4] > 128)
        .map(|bit| 1 << bit)
        .sum()
}
