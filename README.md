# Second Thought

Browser extension (Firefox and Chrome) that forces users to justify visiting distracting websites.

## Layout

- `src/shared/` — options page, justification page, and logging code used by both browsers
- `src/firefox/` — MV2 manifest and blocking `webRequest` background script
- `src/chrome/` — MV3 manifest and `declarativeNetRequest`-based service worker

## Building

```sh
./build.sh
```

This produces loadable bundles in `dist/firefox` and `dist/chrome`. Load them via `about:debugging` (Firefox) or `chrome://extensions` → "Load unpacked" (Chrome).
