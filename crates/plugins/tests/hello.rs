mod support;

use std::sync::OnceLock;

use easyimmerse_plugins::{
    CompiledPlugin, HelloPlugin, HostLimits, LogEntry, LogLevel, PluginPackage,
};

/// Compiles a hello plugin once per test process. Compiling the JavaScript
/// plugin takes over a minute in a debug build, so the tests share the
/// compiled component and instantiate it separately.
fn compiled_hello_plugin(name: &str, cache: &'static OnceLock<CompiledPlugin>) -> HelloPlugin {
    let compiled = cache.get_or_init(|| {
        let package =
            PluginPackage::open(&support::built_plugin_dir(name)).expect("open the package");
        CompiledPlugin::compile(&package, support::execution_mode()).expect("compile the plugin")
    });
    HelloPlugin::instantiate(compiled, HostLimits::default()).expect("instantiate the plugin")
}

fn is_single_info_entry_mentioning(log: &[LogEntry], text: &str) -> bool {
    matches!(log, [entry] if entry.level == LogLevel::Info && entry.message.contains(text))
}

mod hello_rust {
    use super::*;

    static COMPILED: OnceLock<CompiledPlugin> = OnceLock::new();

    fn greet() -> (String, Vec<LogEntry>) {
        compiled_hello_plugin("hello-rust", &COMPILED)
            .greet("world")
            .expect("greet")
    }

    #[test]
    fn greets_by_name() {
        assert_eq!(greet().0, "Hello, world");
    }

    #[test]
    fn logs_one_info_entry_about_the_greeting() {
        assert!(is_single_info_entry_mentioning(
            &greet().1,
            "greeting world"
        ));
    }
}

mod hello_js {
    use super::*;

    static COMPILED: OnceLock<CompiledPlugin> = OnceLock::new();

    fn greet() -> (String, Vec<LogEntry>) {
        compiled_hello_plugin("hello-js", &COMPILED)
            .greet("world")
            .expect("greet")
    }

    #[test]
    fn greets_by_name() {
        assert_eq!(greet().0, "Hello, world");
    }

    #[test]
    fn logs_one_info_entry_about_the_greeting() {
        assert!(is_single_info_entry_mentioning(
            &greet().1,
            "greeting world"
        ));
    }
}
