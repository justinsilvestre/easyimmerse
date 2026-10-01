mod probe;
mod resolve;

wit_bindgen::generate!({
    world: "media-source-fixture",
    path: "../../crates/plugin-api/wit",
});

use easyimmerse::plugin::types::{PluginError, ResolvedMedia};
use exports::easyimmerse::plugin::{media_source, sandbox_probe};

struct FixtureMediaSource;

impl media_source::Guest for FixtureMediaSource {
    fn resolve(locator: String, output_dir: String) -> Result<ResolvedMedia, PluginError> {
        resolve::resolve(&locator, &output_dir)
    }
}

impl sandbox_probe::Guest for FixtureMediaSource {
    fn try_run(command: String) -> Result<(), PluginError> {
        probe::try_run(&command)
    }

    fn try_get(url: String) -> Result<(), PluginError> {
        probe::try_get(&url)
    }
}

export!(FixtureMediaSource);
