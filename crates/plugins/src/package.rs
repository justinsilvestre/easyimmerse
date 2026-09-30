use std::path::{Path, PathBuf};

use sha2::{Digest, Sha256};

use crate::error::PluginError;
use crate::manifest::{PluginManifest, parse_manifest};

/// A plugin directory that has been read and checked: its manifest, its
/// component, and the bundled executables for the current platform.
#[derive(Debug, Clone)]
pub struct PluginPackage {
    pub dir: PathBuf,
    pub manifest: PluginManifest,
    pub wasm_path: PathBuf,
    /// `bin/<target>/` for the current platform, when the package bundles one.
    pub bin_dir: Option<PathBuf>,
    /// The SHA-256 digest of `plugin.wasm` as lowercase hex.
    pub wasm_sha256: String,
}

impl PluginPackage {
    pub fn open(dir: &Path) -> Result<Self, PluginError> {
        let manifest = read_manifest(&dir.join("plugin.toml"))?;
        let wasm_path = dir.join("plugin.wasm");
        let wasm_sha256 = digest_file(&wasm_path)?;
        Ok(Self {
            dir: dir.to_path_buf(),
            manifest,
            wasm_path,
            bin_dir: find_bin_dir(dir),
            wasm_sha256,
        })
    }
}

/// The `bin/<target>/` name for the platform this host was compiled for, or
/// `None` on a platform the package format does not cover.
pub fn current_target_name() -> Option<&'static str> {
    target_name(std::env::consts::ARCH, std::env::consts::OS)
}

fn target_name(arch: &str, os: &str) -> Option<&'static str> {
    match (arch, os) {
        ("x86_64", "linux") => Some("x86_64-linux"),
        ("aarch64", "linux") => Some("aarch64-linux"),
        ("x86_64", "macos") => Some("x86_64-macos"),
        ("aarch64", "macos") => Some("aarch64-macos"),
        ("x86_64", "windows") => Some("x86_64-windows"),
        _ => None,
    }
}

fn read_manifest(path: &Path) -> Result<PluginManifest, PluginError> {
    let text = std::fs::read_to_string(path)
        .map_err(|source| PluginError::io("reading the plugin manifest", path, source))?;
    parse_manifest(&text)
}

fn digest_file(path: &Path) -> Result<String, PluginError> {
    let bytes = std::fs::read(path)
        .map_err(|source| PluginError::io("reading the plugin component", path, source))?;
    Ok(hex::encode(Sha256::digest(bytes)))
}

fn find_bin_dir(dir: &Path) -> Option<PathBuf> {
    let bin_dir = dir.join("bin").join(current_target_name()?);
    bin_dir.is_dir().then_some(bin_dir)
}

#[cfg(test)]
mod tests {
    use std::path::Path;

    use super::{PluginPackage, current_target_name, target_name};
    use crate::manifest::PluginKind;

    const MANIFEST: &str = r#"
name = "example"
version = "0.1.0"
kind = "hello"
interface_version = "0.1.0"
allowed_hosts = []
"#;

    /// The SHA-256 digest of the bytes `abc`.
    const ABC_SHA256: &str = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";

    fn write_package(dir: &Path) {
        std::fs::write(dir.join("plugin.toml"), MANIFEST).unwrap();
        std::fs::write(dir.join("plugin.wasm"), b"abc").unwrap();
    }

    #[test]
    fn reads_the_manifest() {
        let dir = tempfile::tempdir().unwrap();
        write_package(dir.path());
        let package = PluginPackage::open(dir.path()).unwrap();
        assert_eq!(package.manifest.kind, PluginKind::Hello);
    }

    #[test]
    fn computes_the_component_digest_as_hex() {
        let dir = tempfile::tempdir().unwrap();
        write_package(dir.path());
        let package = PluginPackage::open(dir.path()).unwrap();
        assert_eq!(package.wasm_sha256, ABC_SHA256);
    }

    #[test]
    fn has_no_bin_dir_when_the_package_bundles_none() {
        let dir = tempfile::tempdir().unwrap();
        write_package(dir.path());
        let package = PluginPackage::open(dir.path()).unwrap();
        assert_eq!(package.bin_dir, None);
    }

    #[test]
    fn finds_the_bin_dir_for_the_current_target() {
        let dir = tempfile::tempdir().unwrap();
        write_package(dir.path());
        let bin_dir = dir.path().join("bin").join(current_target_name().unwrap());
        std::fs::create_dir_all(&bin_dir).unwrap();
        let package = PluginPackage::open(dir.path()).unwrap();
        assert_eq!(package.bin_dir, Some(bin_dir));
    }

    #[test]
    fn fails_when_the_component_is_missing() {
        let dir = tempfile::tempdir().unwrap();
        std::fs::write(dir.path().join("plugin.toml"), MANIFEST).unwrap();
        assert!(PluginPackage::open(dir.path()).is_err());
    }

    #[test]
    fn maps_arm_macos_to_its_target_name() {
        assert_eq!(target_name("aarch64", "macos"), Some("aarch64-macos"));
    }

    #[test]
    fn has_no_target_name_for_an_uncovered_platform() {
        assert_eq!(target_name("riscv64", "freebsd"), None);
    }
}
