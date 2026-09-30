//! The wasmtime host for easyimmerse plugins. It reads a plugin package,
//! instantiates its component with bounded memory and fuel, and offers the
//! `easyimmerse:plugin` host interfaces subject to the capability grants.

pub mod compiled_plugin;
pub mod engine;
pub mod error;
pub mod execution_mode;
pub mod grants;
pub mod hello_plugin;
pub mod host_state;
pub mod imports;
pub mod limits;
pub mod linker;
pub mod manifest;
pub mod media_source_plugin;
pub mod package;

pub use compiled_plugin::CompiledPlugin;
pub use error::{PluginError, PluginErrorKind};
pub use execution_mode::ExecutionMode;
pub use grants::CapabilityGrants;
pub use hello_plugin::HelloPlugin;
pub use host_state::{HostState, LogEntry, LogLevel};
pub use limits::HostLimits;
pub use manifest::{PluginKind, PluginManifest, SettingSchema, parse_manifest};
pub use media_source_plugin::MediaSourcePlugin;
pub use package::{PluginPackage, current_target_name};
