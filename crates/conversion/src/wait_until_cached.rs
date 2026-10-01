//! Waiting for a file of a conversion to be cached, starting ffmpeg runs as needed.

use std::path::PathBuf;
use std::sync::Arc;
use std::time::Duration;

use tokio::time::{Instant, timeout_at};

use crate::conversion::{Conversion, Step};
use crate::error::ConversionError;
use crate::run::start_run;
use crate::run_control::RunStart;
use crate::spawn_ffmpeg::RunSettings;

/// How long a request waits for its file before failing.
const REQUEST_TIMEOUT: Duration = Duration::from_secs(30);

/// How many runs one request may start. A second run is needed when a request for a distant segment replaces the run that this request waited for.
const MAX_RUNS_PER_REQUEST: u32 = 2;

/// Waits until `path` exists, starting ffmpeg runs for the segment `index` as the run decisions require.
pub async fn wait_until_cached(
    conversion: &Arc<Conversion>,
    settings: &RunSettings,
    path: PathBuf,
    index: u32,
) -> Result<PathBuf, ConversionError> {
    let deadline = Instant::now() + REQUEST_TIMEOUT;
    let mut changes = conversion.subscribe();
    let (mut runs_started, mut waited_run) = (0, None);
    loop {
        changes.borrow_and_update();
        if tokio::fs::try_exists(&path).await? {
            return Ok(path);
        }
        match conversion.next_step(index, waited_run, runs_started < MAX_RUNS_PER_REQUEST)? {
            Step::Wait(run_number) => waited_run = Some(run_number),
            Step::Start(start) => {
                runs_started += 1;
                waited_run = Some(start.number);
                spawn_run(conversion, settings, start);
            }
        }
        match timeout_at(deadline, changes.changed()).await {
            Ok(Ok(())) => {}
            Ok(Err(_)) => return Err(ConversionError::ShutDown),
            Err(_) => return Err(ConversionError::Timeout),
        }
    }
}

/// Starts a reserved run in its own task, so that the run starts or is marked failed even when the request that reserved it is cancelled.
fn spawn_run(conversion: &Arc<Conversion>, settings: &RunSettings, start: RunStart) {
    let (conversion, settings) = (Arc::clone(conversion), settings.clone());
    tokio::spawn(async move {
        if let Err(error) = start_run(&conversion, &settings, start).await {
            conversion.finish_run(start.number, Some(error.to_string()));
        }
    });
}
