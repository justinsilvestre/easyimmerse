//! The `users` subcommands, which manage accounts directly in the database.
//! This is how the first administrator of a server is made.

use std::io::BufRead;

use anyhow::{Context, anyhow};
use easyimmerse_api::accounts::{create_account, set_password};
use easyimmerse_core::account::{AccountRole, AccountUser};
use easyimmerse_storage::Storage;

use crate::cli::{
    CreateUserArgs, DatabaseArgs, DeleteUserArgs, PasswordArgs, SetPasswordArgs, SetRoleArgs,
    UsersCommand,
};

/// The variable the password of a new account is read from without `--password-stdin`.
const PASSWORD_VARIABLE: &str = "EASYIMMERSE_PASSWORD";

pub fn run(command: UsersCommand) -> anyhow::Result<()> {
    match command {
        UsersCommand::Create(args) => create(args),
        UsersCommand::List(args) => list(&args),
        UsersCommand::SetRole(args) => set_role(args),
        UsersCommand::SetPassword(args) => change_password(args),
        UsersCommand::Delete(args) => delete(args),
    }
}

fn create(args: CreateUserArgs) -> anyhow::Result<()> {
    let storage = open(&args.database)?;
    let password = read_password(&args.password)?;
    let user = create_account(&storage, &args.email, &password, args.role)?;
    println!("created {}", describe(&user));
    Ok(())
}

fn list(args: &DatabaseArgs) -> anyhow::Result<()> {
    for user in open(args)?.list_users()? {
        println!("{}", describe(&user));
    }
    Ok(())
}

fn set_role(args: SetRoleArgs) -> anyhow::Result<()> {
    let storage = open(&args.database)?;
    let user = set_role_of(&storage, &args.email, args.role)?;
    println!("updated {}", describe(&user));
    Ok(())
}

/// Changes the role of the account with the email address, unless it is the last administrator.
fn set_role_of(storage: &Storage, email: &str, role: AccountRole) -> anyhow::Result<AccountUser> {
    let user = find_user(storage, email)?;
    Ok(storage.set_user_role(&user.id, role)?)
}

fn change_password(args: SetPasswordArgs) -> anyhow::Result<()> {
    let storage = open(&args.database)?;
    let password = read_password(&args.password)?;
    let user = set_password_of(&storage, &args.email, &password)?;
    println!("changed the password of {}", describe(&user));
    Ok(())
}

/// Gives the account with the email address a new password and ends its sessions.
fn set_password_of(storage: &Storage, email: &str, password: &str) -> anyhow::Result<AccountUser> {
    let user = find_user(storage, email)?;
    set_password(storage, &user.id, password)?;
    Ok(user)
}

fn delete(args: DeleteUserArgs) -> anyhow::Result<()> {
    let storage = open(&args.database)?;
    let user = delete_user_of(&storage, &args.email)?;
    println!("deleted {}", describe(&user));
    Ok(())
}

/// Deletes the account with the email address, unless it is the last administrator.
fn delete_user_of(storage: &Storage, email: &str) -> anyhow::Result<AccountUser> {
    let user = find_user(storage, email)?;
    storage.delete_user(&user.id)?;
    Ok(user)
}

fn open(args: &DatabaseArgs) -> anyhow::Result<Storage> {
    Storage::open(&args.db).with_context(|| format!("could not open {}", args.db.display()))
}

fn find_user(storage: &Storage, email: &str) -> anyhow::Result<AccountUser> {
    let stored = storage.find_user_by_email(email.trim())?;
    stored
        .map(|stored| stored.user)
        .ok_or_else(|| anyhow!("no account has the email address {email:?}"))
}

/// Reads a password from standard input or, without `--password-stdin`, from the environment.
fn read_password(args: &PasswordArgs) -> anyhow::Result<String> {
    if args.password_stdin {
        return read_first_line(std::io::stdin().lock());
    }
    std::env::var(PASSWORD_VARIABLE)
        .with_context(|| format!("pass the password with --password-stdin or {PASSWORD_VARIABLE}"))
}

/// Reads one line without its line ending, so that `echo` can pipe a password in.
fn read_first_line(mut input: impl BufRead) -> anyhow::Result<String> {
    let mut line = String::new();
    input
        .read_line(&mut line)
        .context("could not read the password")?;
    Ok(line.trim_end_matches(['\n', '\r']).to_string())
}

fn describe(user: &AccountUser) -> String {
    format!("{}\t{}\t{}", user.email, user.role, user.id)
}

#[cfg(test)]
mod tests {
    use easyimmerse_api::accounts::authenticate;

    use super::*;

    fn storage_with_reader() -> Storage {
        let storage = Storage::open_in_memory().unwrap();
        create_account(
            &storage,
            "reader@example.com",
            "correct horse",
            AccountRole::LibraryUser,
        )
        .unwrap();
        storage
    }

    #[test]
    fn a_changed_password_logs_in() {
        let storage = storage_with_reader();
        set_password_of(&storage, "Reader@example.com", "battery staple").unwrap();
        assert!(authenticate(&storage, "reader@example.com", "battery staple").is_ok());
    }

    #[test]
    fn a_changed_password_ends_the_sessions() {
        let storage = storage_with_reader();
        let user = find_user(&storage, "reader@example.com").unwrap();
        let token = easyimmerse_api::accounts::start_session(&storage, &user.id, "", 0).unwrap();
        set_password_of(&storage, "reader@example.com", "battery staple").unwrap();
        let found = easyimmerse_api::accounts::find_session(&storage, &token, 1).unwrap();
        assert_eq!(found, None);
    }

    fn storage_with_administrator() -> Storage {
        let storage = Storage::open_in_memory().unwrap();
        create_account(
            &storage,
            "admin@example.com",
            "correct horse",
            AccountRole::Administrator,
        )
        .unwrap();
        storage
    }

    #[test]
    fn refuses_to_demote_the_last_administrator() {
        let storage = storage_with_administrator();
        assert!(set_role_of(&storage, "admin@example.com", AccountRole::Privileged).is_err());
    }

    #[test]
    fn refuses_to_delete_the_last_administrator() {
        let storage = storage_with_administrator();
        assert!(delete_user_of(&storage, "admin@example.com").is_err());
    }

    #[test]
    fn deletes_an_account_that_is_not_the_last_administrator() {
        let storage = storage_with_administrator();
        create_account(
            &storage,
            "reader@example.com",
            "correct horse",
            AccountRole::LibraryUser,
        )
        .unwrap();
        assert!(delete_user_of(&storage, "reader@example.com").is_ok());
    }

    #[test]
    fn changing_the_password_of_an_unknown_address_fails() {
        let storage = storage_with_reader();
        assert!(set_password_of(&storage, "other@example.com", "battery staple").is_err());
    }

    #[test]
    fn reads_a_password_without_its_line_ending() {
        let password = read_first_line("correct horse\r\n".as_bytes()).unwrap();
        assert_eq!(password, "correct horse");
    }

    #[test]
    fn keeps_the_spaces_around_a_password() {
        let password = read_first_line(" spaced \n".as_bytes()).unwrap();
        assert_eq!(password, " spaced ");
    }
}
