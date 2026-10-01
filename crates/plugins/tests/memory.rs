//! None of the built plugins grows its memory, so this test loads a component
//! written in the text format whose `loop-forever` export keeps growing memory
//! until the host refuses, and then traps.

mod support;

use easyimmerse_plugins::{HelloPlugin, HostLimits, PluginPackage};
use wasmtime::Trap;

/// Grows memory by 16 pages (1 MiB) per iteration. If a grow fails, the guest
/// traps with `unreachable`. If memory reaches 2048 pages (128 MiB), the guest
/// returns normally, which means no limit was enforced.
const MEMORY_HOG: &str = r#"
(component
  (core module $m
    (memory (export "memory") 1)
    (global $heap (mut i32) (i32.const 1024))
    (func (export "realloc") (param i32 i32 i32 i32) (result i32)
      (local $ptr i32)
      (local.set $ptr (global.get $heap))
      (global.set $heap (i32.add (local.get $ptr) (local.get 3)))
      (local.get $ptr))
    (func (export "greet") (param i32 i32) (result i32)
      (i32.const 8))
    (func (export "loop-forever")
      (loop $again
        (if (i32.eq (memory.grow (i32.const 16)) (i32.const -1)) (then (unreachable)))
        (br_if $again (i32.lt_u (memory.size) (i32.const 2048))))))
  (core instance $i (instantiate $m))
  (func $greet (param "name" string) (result string)
    (canon lift (core func $i "greet") (memory (core memory $i "memory")) (realloc (core func $i "realloc")) string-encoding=utf8))
  (func $loop (canon lift (core func $i "loop-forever")))
  (instance $hello
    (export "greet" (func $greet))
    (export "loop-forever" (func $loop)))
  (export "easyimmerse:plugin/hello@0.1.0" (instance $hello))
)
"#;

const MANIFEST: &str = r#"
name = "memory-hog"
version = "0.1.0"
kind = "hello"
interface_version = "0.1.0"
allowed_hosts = []
"#;

fn load_memory_hog(dir: &std::path::Path) -> HelloPlugin {
    std::fs::write(dir.join("plugin.wasm"), MEMORY_HOG).expect("write the component");
    std::fs::write(dir.join("plugin.toml"), MANIFEST).expect("write the manifest");
    let package = PluginPackage::open(dir).expect("open the package");
    HelloPlugin::load(&package, support::execution_mode(), HostLimits::default())
        .expect("load the plugin")
}

#[test]
fn a_plugin_that_keeps_growing_memory_is_refused_at_the_memory_limit() {
    let dir = tempfile::tempdir().expect("create a temp dir");
    let error = load_memory_hog(dir.path())
        .loop_forever()
        .expect_err("the grow must fail");
    assert!(
        matches!(error, easyimmerse_plugins::PluginError::Wasmtime(ref inner)
            if inner.downcast_ref::<Trap>() == Some(&Trap::UnreachableCodeReached)),
        "unexpected error: {error}"
    );
}
