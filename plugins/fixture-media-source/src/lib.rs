mod forms;
mod input;
mod probe;
mod resolve;

wit_bindgen::generate!({
    world: "media-source-fixture",
    path: "../../crates/plugin-api/wit",
});

use easyimmerse::plugin::types::{
    FetchRequest, FetchedSubtitle, Form, FormInput, ImportAnswer, ImportContext, ImportRequest,
    MediaAnswer, MediaContext, PluginError, ResolvedMedia,
};
use exports::easyimmerse::plugin::{media_source, sandbox_probe};

struct FixtureMediaSource;

impl media_source::Guest for FixtureMediaSource {
    fn import_form(_context: ImportContext) -> Result<Form, PluginError> {
        Ok(forms::import_form())
    }

    fn import_step(
        _context: ImportContext,
        action: String,
        input: Vec<FormInput>,
    ) -> Result<ImportAnswer, PluginError> {
        forms::import_step(&action, input)
    }

    fn import(request: ImportRequest, output_dir: String) -> Result<ResolvedMedia, PluginError> {
        let subtitles = input::values_of(&request.input, "subtitles");
        resolve::resolve(&request.locator, &output_dir, &subtitles)
    }

    fn media_form(context: MediaContext) -> Result<Form, PluginError> {
        Ok(forms::media_form(&context))
    }

    fn media_step(
        context: MediaContext,
        action: String,
        input: Vec<FormInput>,
    ) -> Result<MediaAnswer, PluginError> {
        forms::media_step(context, &action, input)
    }

    fn fetch_subtitles(
        request: FetchRequest,
        output_dir: String,
    ) -> Result<Vec<FetchedSubtitle>, PluginError> {
        let subtitles = input::values_of(&request.input, "fetch");
        resolve::fetch_subtitles(&request.locator, &output_dir, &subtitles)
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
