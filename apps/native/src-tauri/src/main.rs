// Prevents an additional console window from opening on Windows.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    easyimmerse_lib::run()
}
