// Chrome doesn't define the promise-based `browser` namespace; alias it so
// shared code can use `browser.*` on both browsers. No-op on Firefox.
globalThis.browser ??= chrome;
