// Who has the app open (ADR 0011), shared by the browser and the server.

/** How often an open, visible page checks in. */
export const PULSE_MS = 20_000;
/** A guest seen this recently counts as online: one missed check-in plus slack. */
export const ONLINE_WINDOW_MS = 50_000;
