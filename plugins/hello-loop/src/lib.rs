wit_bindgen::generate!({
    world: "hello-plugin",
    path: "../../crates/plugin-api/wit",
});

use exports::easyimmerse::plugin::hello::Guest;

struct HelloLoop;

impl Guest for HelloLoop {
    fn greet(_name: String) -> String {
        spin()
    }

    fn loop_forever() {
        spin()
    }
}

/// Loops until the host's fuel limit terminates the call.
fn spin() -> ! {
    loop {
        core::hint::black_box(());
    }
}

export!(HelloLoop);
