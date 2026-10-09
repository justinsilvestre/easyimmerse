use crate::easyimmerse::plugin::types::{
    ChoiceControl, FetchRequest, Form, FormAction, FormActionStyle, FormControl, FormField,
    FormInput, FormOption, HeldSubtitle, ImportAnswer, ImportRequest, MediaAnswer, MediaContext,
    MediaUpdate, PluginError, TextControl,
};
use crate::input::values_of;
use crate::resolve::{SUBTITLE_ID, SUBTITLE_NAME};

/// A form with one text field for the locator and an action that imports it.
pub fn import_form() -> Form {
    let locator = TextControl {
        value: String::new(),
        placeholder: None,
    };
    Form {
        title: "Import from the fixture".to_string(),
        description: None,
        fields: vec![field("locator", "Locator", FormControl::Text(locator))],
        actions: vec![primary("import", "Import")],
    }
}

/// Answers `import` with an import of the locator the user entered and the subtitle
/// tracks named in the input's `subtitles` field, passing the whole input on.
pub fn import_step(action: &str, input: Vec<FormInput>) -> Result<ImportAnswer, PluginError> {
    expect_action(action, "import")?;
    let locator = values_of(&input, "locator").concat();
    if locator.is_empty() {
        return Err(PluginError::InvalidInput("enter a locator".to_string()));
    }
    let subtitles = values_of(&input, "subtitles");
    Ok(ImportAnswer::Import(ImportRequest {
        locator,
        input,
        subtitles,
    }))
}

/// A form offering the English track unless it is held already, and the held tracks to
/// remove.
pub fn media_form(context: &MediaContext) -> Form {
    let is_held = context
        .subtitles
        .iter()
        .any(|held| held.name == SUBTITLE_NAME);
    let offered = if is_held {
        Vec::new()
    } else {
        vec![option(SUBTITLE_ID, SUBTITLE_NAME)]
    };
    let held = context.subtitles.iter().map(held_option).collect();
    Form {
        title: "Subtitles from the fixture".to_string(),
        description: None,
        fields: vec![
            field("fetch", "Fetch", choose_many(offered)),
            field("remove", "Remove", choose_many(held)),
        ],
        actions: vec![primary("apply", "Apply")],
    }
}

/// Answers `apply` with the removals and the fetch the user chose.
pub fn media_step(
    context: MediaContext,
    action: &str,
    input: Vec<FormInput>,
) -> Result<MediaAnswer, PluginError> {
    expect_action(action, "apply")?;
    let fetched = values_of(&input, "fetch");
    let fetch = (!fetched.is_empty()).then(|| FetchRequest {
        locator: context.locator,
        input: input.clone(),
        subtitles: fetched,
    });
    Ok(MediaAnswer::Apply(MediaUpdate {
        remove_subtitles: values_of(&input, "remove"),
        fetch,
    }))
}

fn expect_action(action: &str, expected: &str) -> Result<(), PluginError> {
    if action == expected {
        return Ok(());
    }
    Err(PluginError::InvalidInput(format!("no action {action:?}")))
}

fn field(id: &str, label: &str, control: FormControl) -> FormField {
    FormField {
        id: id.to_string(),
        label: label.to_string(),
        hint: None,
        control,
    }
}

fn choose_many(options: Vec<FormOption>) -> FormControl {
    FormControl::ChooseMany(ChoiceControl {
        options,
        chosen: Vec::new(),
    })
}

fn option(id: &str, label: &str) -> FormOption {
    FormOption {
        id: id.to_string(),
        label: label.to_string(),
        hint: None,
    }
}

fn held_option(held: &HeldSubtitle) -> FormOption {
    option(&held.id, &held.name)
}

fn primary(id: &str, label: &str) -> FormAction {
    FormAction {
        id: id.to_string(),
        label: label.to_string(),
        style: FormActionStyle::Primary,
    }
}
