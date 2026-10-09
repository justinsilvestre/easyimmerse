//! A ureq connector that bounds every wait for incoming bytes.
//!
//! ureq's own body timeout covers the whole body, which would cap the length of a download.
//! This connector instead bounds each wait on its own, so a read of the body ends with a timeout
//! once no bytes have arrived for the stall timeout, however long the transfer runs.

use std::time::Duration;

use ureq::Timeout;
use ureq::unversioned::transport::{Buffers, ConnectionDetails, Connector, NextTimeout, Transport};

/// Wraps each connection so that no wait for incoming bytes lasts longer than the given duration.
#[derive(Debug)]
pub(super) struct StallTimeoutConnector(pub Duration);

impl Connector<Box<dyn Transport>> for StallTimeoutConnector {
    type Out = StallTimeoutTransport;

    fn connect(
        &self,
        _details: &ConnectionDetails,
        chained: Option<Box<dyn Transport>>,
    ) -> Result<Option<Self::Out>, ureq::Error> {
        Ok(chained.map(|inner| StallTimeoutTransport {
            inner,
            stall_timeout: self.0,
        }))
    }
}

#[derive(Debug)]
pub(super) struct StallTimeoutTransport {
    inner: Box<dyn Transport>,
    stall_timeout: Duration,
}

impl Transport for StallTimeoutTransport {
    fn buffers(&mut self) -> &mut dyn Buffers {
        self.inner.buffers()
    }

    fn transmit_output(&mut self, amount: usize, timeout: NextTimeout) -> Result<(), ureq::Error> {
        self.inner.transmit_output(amount, timeout)
    }

    fn await_input(&mut self, timeout: NextTimeout) -> Result<bool, ureq::Error> {
        self.inner
            .await_input(cap_timeout(timeout, self.stall_timeout))
    }

    fn is_open(&mut self) -> bool {
        self.inner.is_open()
    }

    fn is_tls(&self) -> bool {
        self.inner.is_tls()
    }
}

fn cap_timeout(timeout: NextTimeout, stall_timeout: Duration) -> NextTimeout {
    if *timeout.after <= stall_timeout {
        return timeout;
    }
    NextTimeout {
        after: stall_timeout.into(),
        reason: Timeout::RecvBody,
    }
}
