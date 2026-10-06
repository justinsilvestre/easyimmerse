use std::io::Read;

use super::error::MdictError;

/// Reads big-endian numbers and byte runs from a decoded section, naming the section in errors.
pub struct ByteCursor<'a> {
    bytes: &'a [u8],
    section: &'static str,
}

impl<'a> ByteCursor<'a> {
    pub fn new(bytes: &'a [u8], section: &'static str) -> Self {
        Self { bytes, section }
    }

    pub fn is_empty(&self) -> bool {
        self.bytes.is_empty()
    }

    pub fn remaining(&self) -> &'a [u8] {
        self.bytes
    }

    pub fn take(&mut self, length: usize) -> Result<&'a [u8], MdictError> {
        if length > self.bytes.len() {
            return Err(MdictError::Truncated(self.section));
        }
        let (taken, rest) = self.bytes.split_at(length);
        self.bytes = rest;
        Ok(taken)
    }

    /// Takes a run whose length the file states as a 64-bit number.
    pub fn take_stated(&mut self, length: u64) -> Result<&'a [u8], MdictError> {
        let length = usize::try_from(length).map_err(|_| MdictError::Truncated(self.section))?;
        self.take(length)
    }

    /// Reads an unsigned big-endian number of `width` bytes, at most eight.
    pub fn read_number(&mut self, width: usize) -> Result<u64, MdictError> {
        let bytes = self.take(width)?;
        Ok(bytes
            .iter()
            .fold(0, |number, &byte| (number << 8) | u64::from(byte)))
    }

    pub fn read_size(&mut self, width: usize) -> Result<usize, MdictError> {
        let number = self.read_number(width)?;
        usize::try_from(number).map_err(|_| MdictError::Malformed(self.section))
    }
}

/// Reads exactly `length` bytes from a stream without trusting `length` for the allocation.
pub fn read_stream_bytes(
    reader: &mut impl Read,
    length: u64,
    section: &'static str,
) -> Result<Vec<u8>, MdictError> {
    let mut bytes = Vec::new();
    reader
        .take(length)
        .read_to_end(&mut bytes)
        .map_err(MdictError::Read)?;
    if bytes.len() as u64 == length {
        Ok(bytes)
    } else {
        Err(MdictError::Truncated(section))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reads_a_big_endian_number() {
        let mut cursor = ByteCursor::new(&[0x01, 0x02, 0x03, 0x04], "test");
        assert_eq!(cursor.read_number(4).unwrap(), 0x0102_0304);
    }

    #[test]
    fn fails_to_take_more_bytes_than_remain() {
        let mut cursor = ByteCursor::new(&[0x01], "test");
        assert!(matches!(cursor.take(2), Err(MdictError::Truncated("test"))));
    }

    #[test]
    fn reads_an_exact_run_of_stream_bytes() {
        let mut stream: &[u8] = &[1, 2, 3];
        assert_eq!(read_stream_bytes(&mut stream, 2, "test").unwrap(), [1, 2]);
    }

    #[test]
    fn fails_to_read_past_the_end_of_a_stream() {
        let mut stream: &[u8] = &[1, 2, 3];
        assert!(matches!(
            read_stream_bytes(&mut stream, 4, "test"),
            Err(MdictError::Truncated("test"))
        ));
    }
}
