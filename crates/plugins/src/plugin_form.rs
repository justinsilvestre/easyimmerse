//! Conversions between the forms and form input of the WIT interface and their core
//! counterparts, which the app shows and sends.

use easyimmerse_core::providers::plugin_form::{
    FormAction, FormActionStyle, FormControl, FormField, FormInput, FormOption, PluginForm,
};
use easyimmerse_plugin_api::base::easyimmerse::plugin::types::{
    ChoiceControl as WitChoiceControl, Form as WitForm, FormAction as WitFormAction,
    FormActionStyle as WitFormActionStyle, FormControl as WitFormControl,
    FormField as WitFormField, FormInput as WitFormInput, FormOption as WitFormOption,
};

pub(crate) fn to_form(form: WitForm) -> PluginForm {
    PluginForm {
        title: form.title,
        description: form.description,
        fields: form.fields.into_iter().map(to_field).collect(),
        actions: form.actions.into_iter().map(to_action).collect(),
    }
}

pub(crate) fn to_inputs(inputs: Vec<WitFormInput>) -> Vec<FormInput> {
    inputs
        .into_iter()
        .map(|input| FormInput {
            field: input.field,
            values: input.values,
        })
        .collect()
}

pub(crate) fn to_wit_inputs(inputs: &[FormInput]) -> Vec<WitFormInput> {
    inputs
        .iter()
        .map(|input| WitFormInput {
            field: input.field.clone(),
            values: input.values.clone(),
        })
        .collect()
}

fn to_field(field: WitFormField) -> FormField {
    FormField {
        id: field.id,
        label: field.label,
        hint: field.hint,
        control: to_control(field.control),
    }
}

fn to_control(control: WitFormControl) -> FormControl {
    match control {
        WitFormControl::Text(text) => FormControl::Text {
            value: text.value,
            placeholder: text.placeholder,
        },
        WitFormControl::ChooseOne(choice) => {
            let (options, chosen) = to_choice(choice);
            FormControl::ChooseOne { options, chosen }
        }
        WitFormControl::ChooseMany(choice) => {
            let (options, chosen) = to_choice(choice);
            FormControl::ChooseMany { options, chosen }
        }
        WitFormControl::Toggle(on) => FormControl::Toggle { on },
        WitFormControl::Note(text) => FormControl::Note { text },
        WitFormControl::Hidden(value) => FormControl::Hidden { value },
    }
}

fn to_choice(choice: WitChoiceControl) -> (Vec<FormOption>, Vec<String>) {
    let options = choice.options.into_iter().map(to_option).collect();
    (options, choice.chosen)
}

fn to_option(option: WitFormOption) -> FormOption {
    FormOption {
        id: option.id,
        label: option.label,
        hint: option.hint,
    }
}

fn to_action(action: WitFormAction) -> FormAction {
    let style = match action.style {
        WitFormActionStyle::Primary => FormActionStyle::Primary,
        WitFormActionStyle::Secondary => FormActionStyle::Secondary,
        WitFormActionStyle::Destructive => FormActionStyle::Destructive,
    };
    FormAction {
        id: action.id,
        label: action.label,
        style,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn keeps_the_value_of_a_hidden_control() {
        let control = to_control(WitFormControl::Hidden("sample".to_string()));
        assert_eq!(
            control,
            FormControl::Hidden {
                value: "sample".to_string()
            }
        );
    }
}
