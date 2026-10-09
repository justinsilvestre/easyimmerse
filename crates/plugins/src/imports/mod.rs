//! Implementations of the host interfaces of the `easyimmerse:plugin` WIT
//! package for [`HostState`](crate::host_state::HostState).

pub mod download;
pub mod fs;
pub mod http;
pub mod log;
pub mod run_command;
pub mod secrets;

use easyimmerse_plugin_api::base::easyimmerse::plugin::types::{self, PluginError};

use crate::error::PluginError as HostError;
use crate::host_state::HostState;

/// The `types` interface declares no functions, but the linker still needs an
/// implementation for it.
impl types::Host for HostState {}

/// Converts a host-side refusal into the variant the plugin receives.
fn to_guest_error(error: HostError) -> PluginError {
    match error {
        HostError::NotPermitted(message) => PluginError::NotPermitted(message),
        HostError::NotFound(message) => PluginError::NotFound(message),
        HostError::Io { .. } => PluginError::Io(error.to_string()),
        other => PluginError::Other(other.to_string()),
    }
}
