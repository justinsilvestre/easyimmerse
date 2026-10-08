//! The wasmtime host for easyimmerse plugins. It reads a plugin package,
//! instantiates its component with bounded memory and fuel, and offers the
//! `easyimmerse:plugin` host interfaces subject to the capability grants.

#[cfg(all(target_os = "ios", not(feature = "interpreter")))]
compile_error!(
    "iOS forbids just-in-time compilation: build easyimmerse-plugins with the `interpreter` feature for iOS targets"
);

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
pub mod media_source_exchange;
pub mod media_source_fixture_plugin;
pub mod media_source_plugin;
pub mod package;
mod plugin_form;

pub use compiled_plugin::CompiledPlugin;
pub use error::{PluginError, PluginErrorKind};
pub use execution_mode::{ExecutionMode, PLATFORM_FORBIDS_JIT};
pub use grants::CapabilityGrants;
pub use hello_plugin::HelloPlugin;
pub use host_state::{HostEvent, HostListener, HostState, LogEntry, LogLevel};
pub use limits::HostLimits;
pub use manifest::{PluginKind, PluginManifest, SettingSchema, parse_manifest};
pub use media_source_exchange::{
    FetchRequest, HeldSubtitle, ImportAnswer, ImportContext, ImportRequest, MediaAnswer,
    MediaContext, MediaUpdate,
};
pub use media_source_fixture_plugin::MediaSourceFixturePlugin;
pub use media_source_plugin::MediaSourcePlugin;
pub use package::{PluginPackage, current_target_name};
