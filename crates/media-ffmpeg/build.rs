// Captures the compilation target so the crate can look for Tauri sidecar binaries,
// which are named `easyimmerse-<binary>-<target triple>` during development.
fn main() {
    let target = std::env::var("TARGET").unwrap_or_default();
    println!("cargo:rustc-env=TARGET={target}");
    println!("cargo:rerun-if-changed=build.rs");
}
