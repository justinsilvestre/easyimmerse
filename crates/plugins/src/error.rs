use std::path::PathBuf;

use wasmtime::Trap;

/// An error raised by the plugin host while loading or running a plugin.
#[derive(Debug, thiserror::Error)]
pub enum PluginError {
    #[error("invalid plugin manifest: {0}")]
    Manifest(#[from] toml::de::Error),
    #[error("{context} ({path}): {source}")]
    Io {
        context: &'static str,
        path: PathBuf,
        source: std::io::Error,
    },
    #[error("wasmtime: {0}")]
    Wasmtime(wasmtime::Error),
    #[error("the plugin reported an error: {0}")]
    Plugin(#[from] PluginErrorKind),
    #[error("not permitted: {0}")]
    NotPermitted(String),
    #[error("not found: {0}")]
    NotFound(String),
    #[error(
        "the interpreter execution mode needs the `interpreter` feature of easyimmerse-plugins"
    )]
    InterpreterUnavailable,
}

/// An error a plugin returns to the host through the `plugin-error` WIT variant.
#[derive(Debug, Clone, PartialEq, Eq, thiserror::Error)]
pub enum PluginErrorKind {
    #[error("not permitted: {0}")]
    NotPermitted(String),
    #[error("not found: {0}")]
    NotFound(String),
    #[error("io: {0}")]
    Io(String),
    #[error("invalid input: {0}")]
    InvalidInput(String),
    #[error("{0}")]
    Other(String),
}

impl PluginError {
    /// Whether the error is a wasmtime trap caused by the store running out of fuel.
    pub fn is_out_of_fuel(&self) -> bool {
        match self {
            Self::Wasmtime(error) => error.downcast_ref::<Trap>() == Some(&Trap::OutOfFuel),
            _ => false,
        }
    }

    pub fn io(context: &'static str, path: impl Into<PathBuf>, source: std::io::Error) -> Self {
        Self::Io {
            context,
            path: path.into(),
            source,
        }
    }
}

impl From<wasmtime::Error> for PluginError {
    fn from(error: wasmtime::Error) -> Self {
        Self::Wasmtime(error)
    }
}
