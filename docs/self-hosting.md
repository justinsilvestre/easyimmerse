# Self-hosting

This document describes how to run the standalone server with accounts, so that several people can log in to one server.

- The server **serves the web app** at its own address, so people can open it in a browser with no separate web server. The sign-in form there offers the server itself. See [Running a server of your own](../README.md#running-a-server-of-your-own).
- By default the server has **no accounts**. Every client presents the one launch token, given by `--token` or `EASYIMMERSE_TOKEN`, and the server makes a random one and prints it to standard error when neither is given.
- **`--accounts`** turns on accounts, so that people can log in with an email address and a password. The server then needs no launch token, but still accepts one when `--token` is given.
- **`--open-signup`** lets anyone who can reach the server sign up, and requires `--accounts`. A new account is a library user. Without it, only an administrator can add accounts.
- These settings, and the server's other flags, can also be kept in a **config file**, named with `--config` or `EASYIMMERSE_CONFIG`. It is a TOML file whose keys are the flag names with underscores instead of hyphens: `bind`, `token`, `accounts`, `open_signup`, `db`, `allow_local_paths`, `cache_dir`, `plugins_dir`, `media_dir`, `ffmpeg_dir`, `expected_hosts`, `web_app_dir` and `api_only`.

  ```toml
  bind = "0.0.0.0:8787"
  accounts = true
  db = "server.sqlite"
  cache_dir = "cache"
  expected_hosts = ["books.example.org"]
  ```

  Relative paths in the file are relative to the file's directory, and an unknown key is an error. A flag overrides an environment variable, and an environment variable overrides the file. `easyimmerse-server config show` prints the settings in effect, without the token. `easyimmerse-server config set <key> <value>` changes one setting and keeps the file's comments.
- **Create the first administrator** with the `users` command, which works on the database file and does not need the server to run. The password is read from the first line of standard input with `--password-stdin`, or else from `EASYIMMERSE_PASSWORD`.

  ```sh
  printf '%s\n' 'a long password' | cargo run -p easyimmerse-server -- users create --db server.sqlite --email admin@example.com --role administrator --password-stdin
  cargo run -p easyimmerse-server -- serve --db server.sqlite --accounts
  ```

- The same command has **`users list`**, **`users set-role --email <email> --role <role>`**, **`users set-password --email <email>`** and **`users delete --email <email>`**, each with `--db`. The roles are `library_user`, `privileged` and `administrator`. `users set-password` reads the password like `users create` does, and ends all of that account's sessions.
- The server keeps at least one administrator. A change that would demote or delete the only administrator account is refused, with the error code `last_administrator`.
- An administrator, or the holder of the launch token, can also list, create, re-role and delete accounts from the Account section of Settings in the web app.
- A password must have at least eight characters. A session lasts 90 days from the last day it was used.
- Within fifteen minutes, one peer address may fail five logins at one email address and thirty logins in all, and one email address may see fifty failed logins from all peers together. Past those limits the server answers further logins with `429 too_many_attempts` and a `Retry-After` header, and the app tells the person how many minutes to wait. The count is kept in memory, so it starts over when the server restarts. Behind a reverse proxy every client shares the proxy's peer address, so the peer limits apply to all of them together until the server reads the forwarded address.
- There is no email verification or password reset yet. An administrator sets a new password with `users set-password`.
- The accounts only identify the person making a request. Projects, flashcards and dictionaries are not yet kept apart per account, so every account sees the same data.
- The web app logs in to such a server from the Account section of Settings, by the server's address. See `VITE_EASYIMMERSE_CLOUD_URL` under [Browser extension](../README.md#browser-extension) in the README for offering the official server there as well.
- `GET /conversion/capabilities` reports the ffmpeg build the server uses and the H.264 encoder that build found. The bundled ffmpeg has no software H.264 encoder, so on a machine without a working hardware encoder, a video that needs converting fails with `no_video_encoder`. To fix this, install an ffmpeg build with libx264 or libopenh264 and point `--ffmpeg-dir` or `ffmpeg_dir` at its directory.
- A server started without `--accounts`, which every client reaches with the launch token, can **pair a device** on its network. The holder of the launch token asks for a six-digit code with `POST /pairing/code`. The device claims the code with `POST /pairing/claim` and receives the launch token in return. A code is valid for ten minutes and works once. After ten wrong claims from one address, or a hundred from all addresses together, within fifteen minutes, the server answers further claims with `429 too_many_attempts` and a `Retry-After` header. A server started with `--accounts` issues no codes, and devices log in to an account instead.
