//! Ids that Anki needs as numbers, derived from the project id so that they stay the same across exports.

use sha2::{Digest, Sha256};

/// Derives the note type id: the first four bytes of the SHA-256 digest of the project id, as a number from 2^30 to 2^31 - 1.
pub(crate) fn note_type_id(project_id: &str) -> u64 {
    id_from_digest(project_id.as_bytes())
}

/// Derives the deck id like the note type id, from the project id with a prefix, so that the two ids differ.
pub(crate) fn deck_id(project_id: &str) -> u64 {
    id_from_digest(format!("deck:{project_id}").as_bytes())
}

fn id_from_digest(input: &[u8]) -> u64 {
    let digest = Sha256::digest(input);
    let leading = u32::from_be_bytes([digest[0], digest[1], digest[2], digest[3]]);
    u64::from((leading & 0x7fff_ffff) | (1 << 30))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn derives_the_note_type_id_from_the_project_id() {
        assert_eq!(note_type_id("project-1"), 1_665_021_395);
    }

    #[test]
    fn derives_the_deck_id_from_the_prefixed_project_id() {
        assert_eq!(deck_id("project-1"), 1_858_653_704);
    }
}
