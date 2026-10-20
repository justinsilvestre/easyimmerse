//! The `users` subcommands, which manage accounts directly in the database.
//! This is how the first administrator of a server is made.

use std::io::BufRead;

use anyhow::{Context, anyhow};
use easyimmerse_api::accounts::create_account;
use easyimmerse_core::account::AccountUser;
use easyimmerse_storage::Storage;

use crate::cli::{CreateUserArgs, DatabaseArgs, DeleteUserArgs, SetRoleArgs, UsersCommand};

/// The variable the password of a new account is read from without `--password-stdin`.
const PASSWORD_VARIABLE: &str = "EASYIMMERSE_PASSWORD";

pub fn run(command: UsersCommand) -> anyhow::Result<()> {
    match command {
        UsersCommand::Create(args) => create(args),
        UsersCommand::List(args) => list(&args),
        UsersCommand::SetRole(args) => set_role(args),
        UsersCommand::Delete(args) => delete(args),
    }
}

fn create(args: CreateUserArgs) -> anyhow::Result<()> {
    let storage = open(&args.database)?;
    let password = read_password(args.password_stdin)?;
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
    let user = find_user(&storage, &args.email)?;
    let user = storage.set_user_role(&user.id, args.role)?;
    println!("updated {}", describe(&user));
    Ok(())
}

fn delete(args: DeleteUserArgs) -> anyhow::Result<()> {
    let storage = open(&args.database)?;
    let user = find_user(&storage, &args.email)?;
    storage.delete_user(&user.id)?;
    println!("deleted {}", describe(&user));
    Ok(())
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

fn read_password(from_stdin: bool) -> anyhow::Result<String> {
    if from_stdin {
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
    use super::*;

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
