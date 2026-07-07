# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Status

v1.0.0 is shipped — submitted to Chrome Web Store, Edge Add-ons and Firefox AMO (July 2026). The roadmap for v1.1 (accessibility toggles) and v1.2 (night comfort) lives in [DEVPLAN.md](DEVPLAN.md) — check it before starting feature work.

## Build & Dev Commands

```bash
npm run build              # Build for both Chrome and Firefox → dist/chrome/, dist/firefox/
npm run build:chrome       # Build for Chrome/Edge only
npm run build:firefox      # Build for Firefox only
npx tsc --noEmit           # Type-check without emitting (run before committing)
npx web-ext run --source-dir dist/firefox  # Launch Firefox with extension auto-loaded + hot reload
```

No test runner is configured. Testing is manual — load the extension in a browser and verify.

## Loading the Extension for Testing

- **Chrome**: `chrome://extensions` → Developer mode → Load unpacked → select `dist/chrome/`
- **Edge**: `edge://extensions` → Developer mode → Load unpacked → select `dist/chrome/` (same build)
- **Firefox**: `about:debugging#/runtime/this-firefox` → Load Temporary Add-on → select `dist/firefox/manifest.json`

After rebuilding, reload the extension from the same page (refresh icon on Chrome/Edge, Reload button on Firefox).

## Architecture

GlowGuard is a Manifest V3 browser extension that dims web pages using fixed overlay divs. It ships separate manifests for Chrome (`background.service_worker`) and Firefox (`background.scripts`) but shares all source code.

### Communication pattern

All parts communicate through `chrome.storage.local` under a single key (`glowguard_settings`). There is no direct messaging between components, with one exception: the service worker sends `{ type: "glowguard-toast", text }` via `chrome.tabs.sendMessage` to the active tab's content script to show an on-page toast (used when keyboard shortcuts are blocked in automatic mode).

```
Popup writes settings → storage → content script's onChanged listener → overlay updates
Service worker writes settings (shortcuts/alarms) → storage → same listener → overlay updates
```

Settings have a `settingsVersion` field; `migrate()` in `shared/settings.ts` upgrades old stored shapes. Bump the version and extend `migrate()` whenever the settings schema changes. All storage reads/writes are wrapped in try/catch and fall back to `DEFAULT_SETTINGS`.

### Content script execution order

1. **anti-flash.ts** (`document_start`) — Fires before the page renders. Creates a 10% dim overlay immediately to prevent white flash. Must stay tiny — no imports, no async, no storage reads. Always runs even when disabled (overlay.ts hides it later).
2. **overlay.ts** (`document_idle`) — Fires after page load. Reads settings, replaces the anti-flash overlay with the real dim/warmth levels. Listens for storage changes to update in real time. Also hosts the toast renderer.

### Automatic mode

When `settings.automatic` is true, overlay.ts ignores manual `dimLevel`/`warmthLevel` and instead computes them from the schedule (day/evening/night periods in `shared/schedule.ts`) plus bright-page detection (`shared/brightness.ts` — one-shot `getComputedStyle` check on html/body background, no DOM scanning). The service worker sets `chrome.alarms` to fire at period boundaries. While automatic is on, the popup's manual controls are disabled and the dim/warmth keyboard shortcuts show a toast instead of acting.

### Warmth / Blue Light Filter

User-facing name is **"Blue Light Filter"**; code says `warmth`. Four named presets (off/soft/warm/deep), each a specific rgba color+opacity in `shared/warmth.ts`. The stored `warmthLevel` is a number (0/8/18/30) mapped back to a preset via `warmthLevelToPreset()`.

### Toolbar icon & restricted pages

The service worker swaps to greyscale icons (`icons/icon-*-disabled.png`) whenever `enabled` is false (`updateIcon()` on storage change). The popup queries the active tab (`activeTab` permission) and shows a "Cannot dim this page" message on privileged URLs (chrome://, about:, store pages).

## Cross-Browser

The `browser` vs `chrome` namespace difference is handled with a one-liner in each file that needs it:
```typescript
const api = (typeof browser !== "undefined" ? browser : chrome) as typeof chrome;
```
The `@types/chrome` package provides types. `src/types/global.d.ts` declares `browser` as a global.

Manifests differ in three ways: Firefox uses `background.scripts` (not `service_worker`), requires `browser_specific_settings.gecko.id`, and requires `data_collection_permissions: { "required": ["none"] }` (AMO rejects submissions without it).

## Performance Constraints

These are intentional design rules, not suggestions:
- Overlays are 1–2 fixed-position divs with `pointer-events: none`. No DOM scanning, no `querySelectorAll("*")`, no MutationObservers, no `setInterval` in content scripts.
- anti-flash.ts must have zero imports and zero async calls — speed is critical.
- Idle CPU must be 0%. No background polling. Event listeners only while the feature that needs them is enabled.
- No network requests. No analytics. No external calls. Everything is local — assets (e.g. fonts) must ship inside the package.

## Build System & Packaging

`scripts/build.js` uses esbuild to bundle 4 entry points (service-worker, anti-flash, overlay, popup) as IIFE format, then copies manifests, popup HTML/CSS, and icons to `dist/<browser>/`. Adding a new entry point requires updating both the build script's `entryPoints` array and the manifest's `content_scripts` or `background` field.

**Store ZIPs:** never use PowerShell `Compress-Archive` — it writes backslash paths and Firefox AMO rejects the archive. Use the yazl one-liner in DEVPLAN.md ("Shipping an Update"). AMO also requires a source-code ZIP (exclude `node_modules`, `dist`, `.git`) because there's a build step.
