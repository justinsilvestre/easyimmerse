//! Reading timing fields from fragmented MP4 (fMP4), the format of HLS init and media segments.

mod boxes;
pub mod error;
pub mod init_segment;
pub mod media_segment;

#[cfg(test)]
mod test_boxes;

pub use error::Fmp4Error;
pub use init_segment::read_track_timescales;
pub use media_segment::read_first_decode_times;
