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
- A person can see the devices they are logged in on, with when each logged in and when it was last used, to within an hour, and log out any of them from the Account section.
- Within fifteen minutes, one peer address may fail five logins at one email address and thirty logins in all, and one email address may see fifty failed logins from all peers together. Past those limits the server answers further logins with `429 too_many_attempts` and a `Retry-After` header, and the app tells the person how many minutes to wait. The count is kept in memory, so it starts over when the server restarts. Behind a reverse proxy every client shares the proxy's peer address, so the peer limits apply to all of them together until the server reads the forwarded address.
- **Email** is optional. Without it the server offers neither address confirmation nor password reset, and an administrator sets a forgotten password with `users set-password`.
- **`--smtp-host <host>`** sends the mail of accounts through an SMTP server, and needs `--accounts`, `--mail-from <address>` and `--public-url <url>`. `--smtp-security` is `starttls` by default, or `tls` or `none`; `--smtp-port` defaults to 587, 465 or 25 to match. `--smtp-user <user>` logs in to the SMTP server, with the password read from `EASYIMMERSE_SMTP_PASSWORD`, which no flag takes.

  ```sh
  EASYIMMERSE_SMTP_PASSWORD='the smtp password' cargo run -p easyimmerse-server -- serve --db server.sqlite --accounts --open-signup \
    --smtp-host smtp.example.com --smtp-user accounts@example.com --mail-from 'easyImmerse <accounts@example.com>' \
    --public-url https://easyimmerse.example.com
  ```

- **`--public-url`** is the address where people open the web app, such as the server's own address once it serves the web app, or the address of a hosted web app. Mailed links point there.
- **`--mail-to-stderr`** prints each mail to standard error instead of sending it, for trying the flows locally. It needs `--accounts` and `--public-url`.
- On a server that sends email, a new account is mailed a link that confirms its address. The link works for 24 hours, and the Account section can send a new one, at most once a minute.
- On such a server, a person who forgot their password can have a link mailed to their address. It works for one hour; choosing a new password through it logs them out on every other device. The server answers the same whether or not an account has the address. Asking for a reset counts against the same limits as a failed login.
- Each account's projects, flashcards, review history, dictionaries and preferences are its own; other accounts cannot see or change them. The holder of the launch token has data of its own as well, kept apart from every account, which is how the desktop and mobile apps keep the device's own work.
- Any server can be the remote that a desktop or mobile app keeps a copy of its work on: the person logs in from the app's Account section, and the app's built-in server then synchronizes projects, flashcards, review history, dictionaries and person-bound preferences with this server, pulling every minute and pushing within seconds of a change. When the same row was changed on two devices, the more recent change is kept and the person is told in the Account section.
- **`--uploads-dir <dir>`** (or `EASYIMMERSE_UPLOADS_DIR`) lets people keep a copy of their media files on the server, so that a film or a recording plays on each of their devices, including the web app. Without it, a server with accounts keeps no copies. A server without accounts that has `--media-dir` keeps them in the `uploads` subdirectory of that directory.
- **`--upload-quota-mb <MB>`** limits how many megabytes of copies each privileged account and administrator may keep; without it they may keep any amount. **`--library-user-upload-quota-mb <MB>`** sets the limit for library users, 0 by default, so that library users keep no copies unless the server allows it. A megabyte is 1,000,000 bytes. The holder of the launch token has no limit. Dictionaries do not count towards the limit.
- An upload past the limit is refused. Turning off "keep a copy on the server" for a media file deletes the copy. The copies of a deleted media file, project or account are deleted within a minute.
- The copies are plain files named after their media file's id. Back up the uploads directory together with the database file; a copy whose database row is gone is not used.
- Media file paths are synchronized along with the other project data, because the same path often exists on the person's other computer; a path that does not exist on a device shows as unavailable there, as today.
- The web app logs in to such a server from the Account section of Settings, by the server's address. See `VITE_EASYIMMERSE_CLOUD_URL` under [Browser extension](../README.md#browser-extension) in the README for offering the official server there as well.
- `GET /conversion/capabilities` reports the ffmpeg build the server uses and the H.264 encoder that build found. The bundled ffmpeg has no software H.264 encoder, so on a machine without a working hardware encoder, a video that needs converting fails with `no_video_encoder`. To fix this, install an ffmpeg build with libx264 or libopenh264 and point `--ffmpeg-dir` or `ffmpeg_dir` at its directory.
- A server started without `--accounts`, which every client reaches with the launch token, can **pair a device** on its network. The holder of the launch token asks for a six-digit code with `POST /pairing/code`. The device claims the code with `POST /pairing/claim` and receives the launch token in return. A code is valid for ten minutes and works once. `POST /pairing/code/current` returns the code to show, and issues a new one when the last one was used or expires within fifteen seconds. A device that claims the code that was just used is answered with `409 pairing_code_used`, which does not count as a wrong claim. After ten wrong claims from one address, or a hundred from all addresses together, within fifteen minutes, the server answers further claims with `429 too_many_attempts` and a `Retry-After` header. A server started with `--accounts` issues no codes, and devices log in to an account instead.
