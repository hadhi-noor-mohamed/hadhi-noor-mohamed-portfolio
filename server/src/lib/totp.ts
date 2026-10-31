import { authenticator } from 'otplib';

// Permit one 30-second step of clock drift in either direction. A code
// generated at the very end of a step (or by a device with a slightly skewed
// clock) would otherwise be rejected, which is a common cause of spurious
// "invalid code" errors. RFC 6238 recommends accepting at least one adjacent
// time step.
authenticator.options = { window: 1 };

export { authenticator };
