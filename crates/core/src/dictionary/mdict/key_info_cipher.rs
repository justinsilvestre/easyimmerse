//! The obfuscation that `Encrypted="2"` applies to the key block index of a version 2.0 file.
//! It needs no secret: the key derives from the block's own checksum.

use ripemd::{Digest, Ripemd128};

use super::error::MdictError;

const HEADER_LENGTH: usize = 8;
const KEY_SUFFIX: [u8; 4] = [0x95, 0x36, 0x00, 0x00];
const INITIAL_PREVIOUS: u8 = 0x36;

/// Returns the block with its payload decrypted, ready for `decode_block`.
pub fn decrypt_key_info(block: &[u8]) -> Result<Vec<u8>, MdictError> {
    if block.len() < HEADER_LENGTH {
        return Err(MdictError::Truncated("key block index"));
    }
    let key = derive_key(&block[4..HEADER_LENGTH]);
    let mut decrypted = block[..HEADER_LENGTH].to_vec();
    let mut previous = INITIAL_PREVIOUS;
    for (index, &byte) in block[HEADER_LENGTH..].iter().enumerate() {
        let mask = previous ^ (index as u8) ^ key[index % key.len()];
        decrypted.push(byte.rotate_left(4) ^ mask);
        previous = byte;
    }
    Ok(decrypted)
}

fn derive_key(checksum: &[u8]) -> [u8; 16] {
    let mut hasher = Ripemd128::new();
    hasher.update(checksum);
    hasher.update(KEY_SUFFIX);
    hasher.finalize().into()
}

/// Applies the inverse of `decrypt_key_info`, for writing test files.
#[cfg(test)]
pub fn encrypt_key_info(block: &[u8]) -> Vec<u8> {
    let key = derive_key(&block[4..HEADER_LENGTH]);
    let mut encrypted = block[..HEADER_LENGTH].to_vec();
    let mut previous = INITIAL_PREVIOUS;
    for (index, &byte) in block[HEADER_LENGTH..].iter().enumerate() {
        let mask = previous ^ (index as u8) ^ key[index % key.len()];
        let encrypted_byte = (byte ^ mask).rotate_left(4);
        encrypted.push(encrypted_byte);
        previous = encrypted_byte;
    }
    encrypted
}

#[cfg(test)]
mod tests {
    use super::*;

    const BLOCK: &[u8] = b"\x02\x00\x00\x00\x12\x34\x56\x78payload bytes";

    #[test]
    fn decrypts_what_it_encrypts() {
        assert_eq!(decrypt_key_info(&encrypt_key_info(BLOCK)).unwrap(), BLOCK);
    }

    #[test]
    fn changes_the_payload_when_encrypting() {
        assert_ne!(encrypt_key_info(BLOCK)[8..], BLOCK[8..]);
    }

    #[test]
    fn keeps_the_block_header_in_the_clear() {
        assert_eq!(encrypt_key_info(BLOCK)[..8], BLOCK[..8]);
    }

    #[test]
    fn rejects_a_block_shorter_than_its_header() {
        assert!(decrypt_key_info(b"\x02\x00").is_err());
    }
}
