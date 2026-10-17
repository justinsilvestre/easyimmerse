use easyimmerse_core::flashcard::FlashcardId;
use sha2::{Digest, Sha256};

/// The digits of Anki's base-91 GUIDs, in order of value.
const BASE91_DIGITS: &[u8; 91] =
    b"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!#$%&()*+,-./:;<=>?@[]^_`{|}~";

/// Derives a note's GUID from the flashcard id, as the genanki library does:
/// the first eight bytes of the SHA-256 digest, read as a big-endian number, written in base 91 with the most significant digit first.
pub(crate) fn note_guid(flashcard_id: &FlashcardId) -> String {
    let digest = Sha256::digest(flashcard_id.0.as_bytes());
    let mut leading = [0; 8];
    leading.copy_from_slice(&digest[..8]);
    let mut rest = u64::from_be_bytes(leading);
    let mut digits = Vec::new();
    while rest > 0 {
        digits.push(char::from(BASE91_DIGITS[(rest % 91) as usize]));
        rest /= 91;
    }
    digits.iter().rev().collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn derives_the_guid_from_the_flashcard_id() {
        let id = FlashcardId("0123456789abcdef0123456789abcdef".to_owned());
        assert_eq!(note_guid(&id), "kY9PHXkz:6");
    }
}
