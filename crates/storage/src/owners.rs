//! Whose data a row is: the device's own, or an account's.

/// The owner of the data of whoever holds the launch token, which is the device's own data.
pub const LAUNCH_OWNER: &str = "launch";

/// The owner of a top-level row: `launch`, or the id of an account.
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct OwnerId(pub String);

impl OwnerId {
    pub fn launch() -> Self {
        Self(LAUNCH_OWNER.to_owned())
    }
}
