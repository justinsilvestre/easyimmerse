/// Reads big-endian integers and NUL-terminated strings from the front of a byte slice.
pub struct ByteCursor<'a> {
    rest: &'a [u8],
}

impl<'a> ByteCursor<'a> {
    pub fn new(bytes: &'a [u8]) -> Self {
        Self { rest: bytes }
    }

    pub fn is_empty(&self) -> bool {
        self.rest.is_empty()
    }

    /// Takes the given number of bytes, or nothing when fewer remain.
    pub fn take(&mut self, count: usize) -> Option<&'a [u8]> {
        let taken = self.rest.get(..count)?;
        self.rest = &self.rest[count..];
        Some(taken)
    }

    /// Takes the bytes before the next NUL and skips the NUL, or takes everything when no NUL remains.
    pub fn take_until_nul(&mut self) -> &'a [u8] {
        let end = self.rest.iter().position(|&byte| byte == 0);
        let taken = &self.rest[..end.unwrap_or(self.rest.len())];
        self.rest = &self.rest[end.map_or(self.rest.len(), |end| end + 1)..];
        taken
    }

    pub fn take_rest(&mut self) -> &'a [u8] {
        std::mem::take(&mut self.rest)
    }

    pub fn take_u32(&mut self) -> Option<u32> {
        self.take(4)?.try_into().ok().map(u32::from_be_bytes)
    }

    pub fn take_u64(&mut self) -> Option<u64> {
        self.take(8)?.try_into().ok().map(u64::from_be_bytes)
    }
}

/// Decodes UTF-8 text, replacing invalid sequences rather than failing.
pub fn decode_text(bytes: &[u8]) -> String {
    String::from_utf8_lossy(bytes).into_owned()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn takes_a_big_endian_u32() {
        assert_eq!(ByteCursor::new(&[0, 0, 1, 2]).take_u32(), Some(258));
    }

    #[test]
    fn takes_a_big_endian_u64() {
        assert_eq!(
            ByteCursor::new(&[0, 0, 0, 1, 0, 0, 0, 2]).take_u64(),
            Some((1 << 32) + 2)
        );
    }

    #[test]
    fn takes_nothing_when_too_few_bytes_remain() {
        assert_eq!(ByteCursor::new(&[1, 2]).take_u32(), None);
    }

    #[test]
    fn skips_the_nul_after_a_string() {
        let mut cursor = ByteCursor::new(b"cat\0dog");
        cursor.take_until_nul();
        assert_eq!(cursor.take_rest(), b"dog");
    }

    #[test]
    fn takes_everything_when_no_nul_remains() {
        assert_eq!(ByteCursor::new(b"cat").take_until_nul(), b"cat");
    }

    #[test]
    fn replaces_invalid_utf8() {
        assert_eq!(decode_text(b"caf\xe9"), "caf\u{fffd}");
    }
}
