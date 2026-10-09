//! Request and response types for speech-to-text, text-to-speech, translation, alignment,
//! and external media sources. The implementations live in plugins; the core crate only
//! defines what crosses the boundary.

pub mod alignment;
pub mod media_source;
pub mod plugin_form;
pub mod speech_to_text;
pub mod text_to_speech;
pub mod translation;

pub use alignment::{AlignmentRequest, AlignmentResponse};
pub use media_source::{MediaLocator, ProgressEvent, ResolvedMedia, ResolvedSubtitle};
pub use plugin_form::{
    FormAction, FormActionStyle, FormControl, FormField, FormInput, FormOption, PluginForm,
};
pub use speech_to_text::{SpeechToTextRequest, SpeechToTextResponse};
pub use text_to_speech::{TextToSpeechRequest, TextToSpeechResponse};
pub use translation::{TranslationRequest, TranslationResponse};
