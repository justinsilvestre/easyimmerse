mod support;

use easyimmerse_plugins::{HelloPlugin, HostLimits, PluginPackage};

fn load_looping_plugin() -> HelloPlugin {
    let package =
        PluginPackage::open(&support::built_plugin_dir("hello-loop")).expect("open the package");
    HelloPlugin::load(&package, support::execution_mode(), HostLimits::default())
        .expect("load the plugin")
}

#[test]
fn a_plugin_that_never_returns_is_stopped_by_the_fuel_limit() {
    let error = load_looping_plugin()
        .greet("world")
        .expect_err("greet must fail");
    assert!(error.is_out_of_fuel(), "unexpected error: {error}");
}

#[test]
fn loop_forever_is_stopped_by_the_fuel_limit() {
    let error = load_looping_plugin()
        .loop_forever()
        .expect_err("the loop must fail");
    assert!(error.is_out_of_fuel(), "unexpected error: {error}");
}
