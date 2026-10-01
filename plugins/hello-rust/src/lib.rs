wit_bindgen::generate!({
    world: "hello-plugin",
    path: "../../crates/plugin-api/wit",
});

use exports::easyimmerse::plugin::hello::Guest;

struct HelloRust;

impl Guest for HelloRust {
    fn greet(name: String) -> String {
        easyimmerse::plugin::log::info(&format!("greeting {name}"));
        format!("Hello, {name}")
    }

    /// This plugin does not loop; the `hello-loop` plugin covers the fuel-limit test.
    fn loop_forever() {}
}

export!(HelloRust);
