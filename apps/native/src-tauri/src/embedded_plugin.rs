//! The built `hello-rust` plugin, compiled into the binary so the plugin check needs no
//! files at run time. `mise run plugins:build-rust` writes the files this module embeds.

use std::path::Path;

use easyimmerse_plugins::PluginPackage;

use crate::plugin_check::PluginCheckError;

const WASM: &[u8] = include_bytes!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/../../../plugins/hello-rust/dist/plugin.wasm"
));
const MANIFEST: &str = include_str!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/../../../plugins/hello-rust/dist/plugin.toml"
));

/// Writes the package under `cache_dir` and opens it, since the host reads a package from a directory.
pub fn unpack_into(cache_dir: &Path) -> Result<PluginPackage, PluginCheckError> {
    let dir = cache_dir.join("plugin-check").join("hello-rust");
    std::fs::create_dir_all(&dir).map_err(|source| write_error(&dir, source))?;
    write(&dir.join("plugin.wasm"), WASM)?;
    write(&dir.join("plugin.toml"), MANIFEST.as_bytes())?;
    Ok(PluginPackage::open(&dir)?)
}

fn write(path: &Path, contents: &[u8]) -> Result<(), PluginCheckError> {
    std::fs::write(path, contents).map_err(|source| write_error(path, source))
}

fn write_error(path: &Path, source: std::io::Error) -> PluginCheckError {
    PluginCheckError::Write {
        path: path.to_path_buf(),
        source,
    }
}
