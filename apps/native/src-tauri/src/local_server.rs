//! Runs the API server on the same device as the desktop app.
//! The server is a Node program, run by a Node executable bundled with the app.

use std::error::Error;
use std::net::{SocketAddr, TcpListener, TcpStream};
use std::path::PathBuf;
use std::time::Duration;

use tauri::{AppHandle, Manager};
use tauri_plugin_shell::process::CommandChild;
use tauri_plugin_shell::ShellExt;

const SERVER_SCRIPT: &str = "resources/server/easyimmerse-server.mjs";
const CONNECTION_ATTEMPTS: u32 = 100;
const CONNECTION_ATTEMPTS_INTERVAL: Duration = Duration::from_millis(100);

pub struct LocalServer {
    address: SocketAddr,
}

impl LocalServer {
    /// Chooses the address of the server, which accepts connections from this device only.
    pub fn choose_address() -> Result<Self, Box<dyn Error>> {
        let address = SocketAddr::from(([127, 0, 0, 1], choose_port()?));
        Ok(Self { address })
    }
}

/// Holds the running server. The server stops once this value is discarded,
/// because the server's standard input is closed as a result.
struct ServerProcess(#[allow(dead_code)] CommandChild);

/// Starts the server at the address chosen earlier.
pub fn start(app: &AppHandle) -> Result<(), Box<dyn Error>> {
    let address = app.state::<LocalServer>().address;
    let data_folder = find_data_folder(app)?;
    std::fs::create_dir_all(&data_folder)?;
    let script = app.path().resource_dir()?.join(SERVER_SCRIPT);
    let (_output, process) = app
        .shell()
        .sidecar("node")?
        .arg(dunce::simplified(&script))
        .args(["--port", &address.port().to_string()])
        .arg("--database")
        .arg(data_folder.join("easyimmerse.sqlite"))
        .arg("--log-file")
        .arg(data_folder.join("server.log"))
        .arg("--stop-when-input-closes")
        .spawn()?;
    app.manage(ServerProcess(process));
    Ok(())
}

/// Returns the address of the server once it accepts connections,
/// or nothing if the server does not become available in time.
pub async fn wait_for_server_url(app: &AppHandle) -> Option<String> {
    let address = app.try_state::<LocalServer>()?.address;
    tauri::async_runtime::spawn_blocking(move || wait_for_connection(address))
        .await
        .ok()?
        .then(|| format!("http://{address}"))
}

fn wait_for_connection(address: SocketAddr) -> bool {
    (0..CONNECTION_ATTEMPTS).any(|_| {
        let is_connected = TcpStream::connect(address).is_ok();
        if !is_connected {
            std::thread::sleep(CONNECTION_ATTEMPTS_INTERVAL);
        }
        is_connected
    })
}

/// Uses the port given in the environment, or else lets the operating system choose a free port.
fn choose_port() -> Result<u16, Box<dyn Error>> {
    if let Ok(port) = std::env::var("EASYIMMERSE_SERVER_PORT") {
        return Ok(port.parse()?);
    }
    Ok(TcpListener::bind("127.0.0.1:0")?.local_addr()?.port())
}

/// Uses the folder given in the environment, or else the standard folder for the app's data.
fn find_data_folder(app: &AppHandle) -> Result<PathBuf, Box<dyn Error>> {
    match std::env::var_os("EASYIMMERSE_DATA_FOLDER") {
        Some(folder) => Ok(PathBuf::from(folder)),
        None => Ok(app.path().app_data_dir()?),
    }
}
