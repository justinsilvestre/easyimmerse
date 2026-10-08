use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;

/// A form a plugin asks the app to show. The app adds a way to close it.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct PluginForm {
    pub title: String,
    /// Explains the form under its title.
    pub description: Option<String>,
    pub fields: Vec<FormField>,
    pub actions: Vec<FormAction>,
}

/// One labelled control in a plugin form.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct FormField {
    /// Names the field in the input the app sends back.
    pub id: String,
    pub label: String,
    /// Explains the field under its label.
    pub hint: Option<String>,
    pub control: FormControl,
}

/// The kind of control a form field shows, with what the control starts out as.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[serde(tag = "kind", rename_all = "kebab-case")]
#[ts(export)]
pub enum FormControl {
    /// A single-line text input.
    Text {
        value: String,
        placeholder: Option<String>,
    },
    /// A choice of one option.
    ChooseOne {
        options: Vec<FormOption>,
        /// The ids of the options chosen to begin with.
        chosen: Vec<String>,
    },
    /// A choice of any number of options, shown as checkboxes.
    ChooseMany {
        options: Vec<FormOption>,
        /// The ids of the options chosen to begin with.
        chosen: Vec<String>,
    },
    /// A yes-or-no switch.
    Toggle { on: bool },
    /// A paragraph of text that is only read.
    Note { text: String },
}

/// One option of a choice control.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct FormOption {
    pub id: String,
    pub label: String,
    /// Explains the option beside its label.
    pub hint: Option<String>,
}

/// A button at the foot of a form. Pressing it sends the form's input and the button's
/// id back to the plugin.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct FormAction {
    pub id: String,
    pub label: String,
    pub style: FormActionStyle,
}

/// How prominently an action button is shown.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[serde(rename_all = "kebab-case")]
#[ts(export)]
pub enum FormActionStyle {
    Primary,
    Secondary,
    Destructive,
}

/// What the user entered in one field: the text, the ids of the chosen options, or
/// "true" or "false" for a toggle. A note sends nothing.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct FormInput {
    pub field: String,
    pub values: Vec<String>,
}
