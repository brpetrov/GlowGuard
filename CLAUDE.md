# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

All parts communicate through `chrome.storage.local` under a single key (`glowguard_settings`). There is no direct messaging between components.

```
Popup writes settings → storage → content script's onChanged listener → overlay updates
Service worker writes settings (shortcuts/alarms) → storage → same listener → overlay updates
```

### Content script execution order

1. **anti-flash.ts** (`document_start`) — Fires before the page renders. Creates a 10% dim overlay immediately to prevent white flash. Must stay tiny — no imports, no async, no storage reads. Always runs even when disabled (overlay.ts hides it later).
2. **overlay.ts** (`document_idle`) — Fires after page load. Reads settings, replaces the anti-flash overlay with the real dim/warmth levels. Listens for storage changes to update in real time.

### Automatic mode

When `settings.automatic` is true, overlay.ts ignores manual `dimLevel`/`warmthLevel` and instead computes them from the schedule (day/evening/night periods in `shared/schedule.ts`) plus bright-page detection (`shared/brightness.ts` — one-shot `getComputedStyle` check on html/body background, no DOM scanning). The service worker sets `chrome.alarms` to fire at period boundaries.

### Warmth system

Warmth uses 4 named presets (off/soft/warm/deep) instead of a continuous slider. Each preset maps to a specific rgba color+opacity defined in `shared/warmth.ts`. The `warmthLevel` stored in settings is a number (0/8/18/30) that maps back to a preset name via `warmthLevelToPreset()`.

## Cross-Browser

The `browser` vs `chrome` namespace difference is handled with a one-liner in each file that needs it:
```typescript
const api = (typeof browser !== "undefined" ? browser : chrome) as typeof chrome;
```
The `@types/chrome` package provides types. `src/types/global.d.ts` declares `browser` as a global.

Manifests differ in two ways: Firefox uses `background.scripts` (not `service_worker`) and requires `browser_specific_settings.gecko.id`.

## Performance Constraints

These are intentional design rules, not suggestions:
- Overlays are 1–2 fixed-position divs with `pointer-events: none`. No DOM scanning, no `querySelectorAll("*")`, no MutationObservers, no `setInterval` in content scripts.
- anti-flash.ts must have zero imports and zero async calls — speed is critical.
- Idle CPU must be 0%. No background polling.
- No network requests. No analytics. No external calls. Everything is local.

## Build System

`scripts/build.js` uses esbuild to bundle 4 entry points (service-worker, anti-flash, overlay, popup) as IIFE format, then copies manifests, popup HTML/CSS, and icons to `dist/<browser>/`. Adding a new entry point requires updating both the build script's `entryPoints` array and the manifest's `content_scripts` or `background` field.
