# The plugin manifest

Every plugin package contains a `plugin.toml` beside its `plugin.wasm`. The host reads it before loading the component to decide which world to instantiate the component with and which host capabilities to grant.

## Fields

| Field | Type | Meaning |
|---|---|---|
| `name` | string | The plugin's identifier. Unique among installed plugins. |
| `title` | string, optional | How the plugin is named to the user. Defaults to `name`. |
| `version` | string | The plugin's own version, as semver. |
| `kind` | string | The capability the plugin exports. One of `speech-to-text`, `text-to-speech`, `translation`, `alignment`, `dictionary-format`, `media-step`, `flashcard-export`, `media-source`, or `hello`. The `hello` kind exists only for the host tests. |
| `interface_version` | string | The version of the `easyimmerse:plugin` WIT package the component was built against. Currently `"0.1.0"`. |
| `allowed_hosts` | list of strings | Host names the plugin may reach through the `http` import. The host refuses requests to any other host. May be empty. |
| `import_label` | string, optional | Media-source plugins only. The text of the plugin's import button. Defaults to "Add from <title>". |
| `settings` | array of tables, optional | Values the user enters for this plugin, which the plugin reads through the `secrets` import. |

Each `[[settings]]` entry has these fields:

| Field | Type | Meaning |
|---|---|---|
| `key` | string | The name the plugin passes to `secrets.get`. |
| `label` | string | The text shown to the user beside the input. |
| `secret` | bool | Whether the value is hidden in the user interface and stored in the credential store rather than in plain configuration. |

## Executables

A plugin that uses the `run-command` import bundles its executables under `bin/<target>/`, where `<target>` is one of `x86_64-linux`, `aarch64-linux`, `x86_64-macos`, `aarch64-macos`, or `x86_64-windows`. The plugin names an executable by its bare file name, and the host resolves that name inside the directory for the current platform. Executables outside the package are refused unless the user has configured them in the plugin's settings.

## Example

```toml
name = "deepl-translation"
version = "1.2.0"
kind = "translation"
interface_version = "0.1.0"
allowed_hosts = ["api.deepl.com"]

[[settings]]
key = "api_key"
label = "DeepL API key"
secret = true

[[settings]]
key = "formality"
label = "Formality (default, more, or less)"
secret = false
```
