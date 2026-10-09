//! Plugin components compiled once per process and shared by every call to the plugin.

use std::collections::HashMap;
use std::sync::{Arc, Mutex, OnceLock, PoisonError};

use easyimmerse_plugins::{CompiledPlugin, ExecutionMode, PluginError, PluginPackage};

/// Identifies one compiled component: the digest of the plugin's `plugin.wasm` and the
/// name of the execution mode it was compiled for. A changed component has a new digest,
/// so it is never served from an older compile.
type CompileKey = (String, &'static str);

/// The compiled component of `package` for `mode`, compiled on the first call and reused
/// by every later one.
pub fn compiled_plugin(
    package: &PluginPackage,
    mode: ExecutionMode,
) -> Result<Arc<CompiledPlugin>, PluginError> {
    static CACHE: OnceLock<CompileCache<CompiledPlugin>> = OnceLock::new();
    let key = (package.wasm_sha256.clone(), mode.name());
    CACHE
        .get_or_init(CompileCache::default)
        .get_or_compile(key, || CompiledPlugin::compile(package, mode))
}

/// Values compiled at most once per key.
pub struct CompileCache<T> {
    entries: Mutex<HashMap<CompileKey, Arc<T>>>,
}

impl<T> Default for CompileCache<T> {
    fn default() -> Self {
        Self {
            entries: Mutex::new(HashMap::new()),
        }
    }
}

impl<T> CompileCache<T> {
    /// The value stored under `key`, or the result of `compile` once it succeeds. The lock is
    /// held while compiling, so two first calls for the same plugin do not both compile it.
    pub fn get_or_compile<E>(
        &self,
        key: CompileKey,
        compile: impl FnOnce() -> Result<T, E>,
    ) -> Result<Arc<T>, E> {
        let mut entries = self.entries.lock().unwrap_or_else(PoisonError::into_inner);
        if let Some(value) = entries.get(&key) {
            return Ok(Arc::clone(value));
        }
        let value = Arc::new(compile()?);
        entries.insert(key, Arc::clone(&value));
        Ok(value)
    }
}

#[cfg(test)]
mod tests {
    use std::cell::Cell;

    use super::*;

    fn key(digest: &str) -> CompileKey {
        (digest.to_string(), "native")
    }

    fn compile_twice(cache: &CompileCache<u32>, first: &str, second: &str) -> u32 {
        let compiles = Cell::new(0);
        let compile = || {
            compiles.set(compiles.get() + 1);
            Ok::<_, ()>(0)
        };
        cache.get_or_compile(key(first), compile).unwrap();
        cache.get_or_compile(key(second), compile).unwrap();
        compiles.get()
    }

    #[test]
    fn compiles_once_for_two_calls_with_the_same_key() {
        let cache = CompileCache::default();
        assert_eq!(compile_twice(&cache, "abc", "abc"), 1);
    }

    #[test]
    fn compiles_again_for_a_changed_digest() {
        let cache = CompileCache::default();
        assert_eq!(compile_twice(&cache, "abc", "def"), 2);
    }

    #[test]
    fn returns_the_stored_value_to_a_second_call() {
        let cache = CompileCache::default();
        let first = cache.get_or_compile(key("abc"), || Ok::<_, ()>(1)).unwrap();
        let second = cache.get_or_compile(key("abc"), || Ok::<_, ()>(2)).unwrap();
        assert!(Arc::ptr_eq(&first, &second));
    }

    #[test]
    fn compiles_again_after_a_failed_compile() {
        let cache = CompileCache::<u32>::default();
        let _ = cache.get_or_compile(key("abc"), || Err(()));
        assert_eq!(
            cache.get_or_compile(key("abc"), || Ok::<_, ()>(1)),
            Ok(Arc::new(1))
        );
    }

    #[test]
    fn shares_compiled_plugins_across_threads() {
        fn assert_send_sync<T: Send + Sync>() {}
        assert_send_sync::<CompileCache<CompiledPlugin>>();
    }
}
