//! Checks that the WIT package parses and declares the worlds the host and
//! the plugins build against.

use easyimmerse_plugin_api::WIT_DIR;
use wit_parser::Resolve;

fn world_names() -> Vec<String> {
    let mut resolve = Resolve::default();
    resolve
        .push_dir(WIT_DIR)
        .expect("the WIT package under WIT_DIR should parse");
    resolve
        .worlds
        .iter()
        .map(|(_, world)| world.name.clone())
        .collect()
}

macro_rules! world_exists_test {
    ($test_name:ident, $world:literal) => {
        #[test]
        fn $test_name() {
            assert!(
                world_names().iter().any(|name| name == $world),
                "world {} should be declared",
                $world
            );
        }
    };
}

world_exists_test!(declares_the_plugin_base_world, "plugin-base");
world_exists_test!(
    declares_the_speech_to_text_plugin_world,
    "speech-to-text-plugin"
);
world_exists_test!(
    declares_the_text_to_speech_plugin_world,
    "text-to-speech-plugin"
);
world_exists_test!(declares_the_translation_plugin_world, "translation-plugin");
world_exists_test!(declares_the_alignment_plugin_world, "alignment-plugin");
world_exists_test!(
    declares_the_dictionary_format_plugin_world,
    "dictionary-format-plugin"
);
world_exists_test!(declares_the_media_step_plugin_world, "media-step-plugin");
world_exists_test!(
    declares_the_flashcard_export_plugin_world,
    "flashcard-export-plugin"
);
world_exists_test!(
    declares_the_media_source_plugin_world,
    "media-source-plugin"
);
world_exists_test!(declares_the_hello_plugin_world, "hello-plugin");
world_exists_test!(
    declares_the_media_source_fixture_world,
    "media-source-fixture"
);
