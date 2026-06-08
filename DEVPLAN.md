# GlowGuard Development Plan

## Project Overview

**GlowGuard** is a lightweight page-dimming browser extension for Chrome, Edge, and Firefox. It softens harsh bright websites using a simple overlay — no full dark mode, no DOM rewriting, no performance cost.

**Core philosophy:** One or two fixed overlay elements. Zero idle CPU. No external calls. No tracking.

### Target Browsers

| Browser      | Manifest                              | Store                 |
| ------------ | ------------------------------------- | --------------------- |
| Chrome 116+  | V3                                    | Chrome Web Store      |
| Edge 116+    | V3 (Chromium)                         | Edge Add-ons          |
| Firefox 109+ | V3 (with `browser_specific_settings`) | Firefox Add-ons (AMO) |

### MVP Features

- Anti-flash early overlay (document_start injection)
- Toggle dimmer on/off
- Dim level slider (0–40%)
- Warm tint slider (separate from dim)
- Day/evening/night schedule with per-period dim + warmth
- Per-site disable
- Per-site dim/warmth override
- Bright-page boost (lightweight background-color check)
- Keyboard shortcuts (toggle, increase/decrease dim, disable on current site)
- Local-only settings storage

---

## Prerequisites & Software Setup

Before any code, confirm the following are installed and working.

### Required Software

| Tool           | Version               | Purpose                            | Install                         |
| -------------- | --------------------- | ---------------------------------- | ------------------------------- |
| **Node.js**    | 20 LTS+               | Build tooling, TypeScript compiler | https://nodejs.org              |
| **npm**        | 10+ (ships with Node) | Package management                 | Comes with Node                 |
| **TypeScript** | 5.4+                  | Type-safe source code              | `npm install` (devDependency)   |
| **Git**        | 2.40+                 | Version control                    | https://git-scm.com             |
| **Chrome**     | 116+                  | Primary dev/test browser           | Already installed               |
| **Firefox**    | 109+                  | Secondary test browser             | https://www.mozilla.org/firefox |
| **VS Code**    | Latest                | Editor (recommended)               | https://code.visualstudio.com   |

### Optional but Recommended

| Tool                           | Purpose                                                           |
| ------------------------------ | ----------------------------------------------------------------- |
| **web-ext**                    | Firefox extension dev server & linting (`npm install -g web-ext`) |
| **Chrome Extensions Reloader** | Auto-reload on file change during dev                             |

### Setup Verification Checklist

Run each command and confirm it succeeds before proceeding:

```
node --version          # expect v20.x+
npm --version           # expect 10.x+
npx tsc --version       # expect 5.4+ (after npm install)
git --version           # expect 2.40+
```

Open `chrome://extensions` in Chrome → confirm "Developer mode" toggle exists.
Open `about:debugging#/runtime/this-firefox` in Firefox → confirm "Load Temporary Add-on" button exists.

---

## File & Folder Structure

```
GlowGuard/
├── DEVPLAN.md                  # This file
├── package.json                # Node project + scripts
├── tsconfig.json               # TypeScript config
├── .gitignore
│
├── src/
│   ├── background/
│   │   └── service-worker.ts   # Background script (toolbar, commands, alarms)
│   │
│   ├── content/
│   │   ├── anti-flash.ts       # document_start: emergency overlay (tiny, no imports)
│   │   └── overlay.ts          # document_idle: full overlay controller
│   │
│   ├── popup/
│   │   ├── popup.html
│   │   ├── popup.css
│   │   └── popup.ts
│   │
│   ├── options/
│   │   ├── options.html
│   │   ├── options.css
│   │   └── options.ts
│   │
│   ├── shared/
│   │   ├── settings.ts         # Settings read/write, defaults, types
│   │   ├── schedule.ts         # Day/evening/night time logic
│   │   ├── site-rules.ts       # Per-site settings match/merge
│   │   ├── brightness.ts       # Bright-page detection (lightweight)
│   │   └── constants.ts        # Shared constants, key names, defaults
│   │
│   └── types/
│       └── settings.d.ts       # Shared TypeScript interfaces
│
├── manifests/
│   ├── chrome/
│   │   └── manifest.json       # Chrome/Edge V3 manifest
│   └── firefox/
│       └── manifest.json       # Firefox V3 manifest (with browser_specific_settings)
│
├── icons/
│   ├── icon-16.png
│   ├── icon-32.png
│   ├── icon-48.png
│   └── icon-128.png
│
├── dist/                       # Build output (gitignored)
│   ├── chrome/
│   └── firefox/
│
├── scripts/
│   └── build.ts                # Build script: compile TS, copy assets, output per-browser
│
└── test/                       # Manual test checklists + any automated tests
    └── manual-checklist.md
```

---

## Data Model — Settings

All settings stored in `chrome.storage.local` (or `browser.storage.local` on Firefox).

### TypeScript Interfaces

```typescript
// ──── Core Types ────

interface GlowGuardSettings {
  enabled: boolean; // Master on/off
  dimLevel: number; // 0–40, percentage
  warmthLevel: number; // 0–40, percentage
  schedule: ScheduleSettings;
  siteRules: SiteRule[];
  brightBoost: BrightBoostSettings;
  antiFlash: AntiFlashSettings;
}

// ──── Schedule ────

interface ScheduleSettings {
  enabled: boolean;
  day: PeriodSettings; // e.g. 06:00–18:00
  evening: PeriodSettings; // e.g. 18:00–22:00
  night: PeriodSettings; // e.g. 22:00–06:00
  dayStart: string; // "HH:MM" — start of day period
  eveningStart: string; // "HH:MM" — start of evening period
  nightStart: string; // "HH:MM" — start of night period
}

interface PeriodSettings {
  dimLevel: number; // 0–40
  warmthLevel: number; // 0–40
}

// ──── Per-Site Rules ────

interface SiteRule {
  pattern: string; // hostname or hostname glob, e.g. "*.google.com"
  enabled: boolean; // false = GlowGuard disabled on this site
  dimLevel?: number; // override (undefined = use global/schedule)
  warmthLevel?: number; // override
}

// ──── Bright-Page Boost ────

interface BrightBoostSettings {
  enabled: boolean;
  extraDim: number; // 5–10, percentage added on bright pages
}

// ──── Anti-Flash ────

interface AntiFlashSettings {
  enabled: boolean;
  emergencyDim: number; // dim applied at document_start (e.g. 10%)
}
```

### Default Values

```typescript
const DEFAULT_SETTINGS: GlowGuardSettings = {
  enabled: true,
  dimLevel: 10,
  warmthLevel: 0,
  schedule: {
    enabled: false,
    day: { dimLevel: 6, warmthLevel: 0 },
    evening: { dimLevel: 12, warmthLevel: 10 },
    night: { dimLevel: 20, warmthLevel: 15 },
    dayStart: '06:00',
    eveningStart: '18:00',
    nightStart: '22:00',
  },
  siteRules: [],
  brightBoost: {
    enabled: true,
    extraDim: 5,
  },
  antiFlash: {
    enabled: true,
    emergencyDim: 10,
  },
};
```

### Storage Key

Single key: `"glowguard_settings"` → serialized `GlowGuardSettings` object.

---

## Development Phases

### Phase 0 — Project Scaffolding & Toolchain

**Goal:** Empty extension loads in Chrome and Firefox. Build pipeline works.

#### Tasks

| #   | Task                                 | Detail                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| --- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 0.1 | `git init` + `.gitignore`            | Ignore `node_modules/`, `dist/`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 0.2 | `npm init` + install devDependencies | `typescript`, `esbuild` (fast bundler), `web-ext` (Firefox dev/lint) |
| 0.3 | Create `tsconfig.json`               | `strict: true`, `target: "ES2022"`, `module: "ESNext"`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 0.4 | Create Chrome manifest               | Minimal V3: `manifest_version: 3`, `name`, `version`, `action`, `icons`, `permissions: ["storage"]`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 0.5 | Create Firefox manifest              | Same as Chrome + `browser_specific_settings.gecko.id`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 0.6 | Create placeholder icon              | Simple 128×128 PNG (can be generated or hand-drawn)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 0.7 | Create build script                  | esbuild: bundle each entry point, copy manifests + HTML + icons to `dist/chrome/` and `dist/firefox/`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 0.8 | Add npm scripts                      | `build`, `build:chrome`, `build:firefox`, `dev` (watch mode)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |

#### Acceptance Tests — Phase 0

- [ ] `npm run build` completes without errors.
- [ ] Load `dist/chrome/` in `chrome://extensions` → extension appears with name and icon, no errors.
- [ ] Load `dist/firefox/` in `about:debugging` → extension appears, no errors.
- [ ] Click extension icon → empty popup opens (or default browser action).

---

### Phase 1 — Anti-Flash + Basic Dimming Overlay

**Goal:** Pages get dimmed. No bright flash on load. Slider in popup controls dim level.

#### Tasks

| #   | Task                         | Detail                                                                                                                                                                                                                 |
| --- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.1 | Create `anti-flash.ts`       | Runs at `document_start`. Creates a full-viewport `<div>` with `position:fixed; inset:0; z-index:2147483647; pointer-events:none; background:rgba(0,0,0,0.10)`. No imports — must be tiny and self-contained.          |
| 1.2 | Create `overlay.ts`          | Runs at `document_idle`. Reads settings from storage. Replaces or adjusts the anti-flash overlay to match the user's dim level. Creates the overlay if anti-flash was disabled. `pointer-events:none` always.          |
| 1.3 | Create `shared/settings.ts`  | `getSettings()`, `saveSettings()`, `getEffectiveDim()` (considers schedule, site rules, boost). Use `chrome.storage.local`. For Firefox compat, use a thin wrapper or `globalThis.browser?.storage ?? chrome.storage`. |
| 1.4 | Create `shared/constants.ts` | Storage key, default settings, max/min values.                                                                                                                                                                         |
| 1.5 | Create popup HTML + CSS + TS | Toggle switch (on/off). Dim slider (0–40%). Display current level. Saves to storage on change.                                                                                                                         |
| 1.6 | Wire up manifests            | Register `anti-flash.ts` as content script at `document_start` with `"matches": ["<all_urls>"]` or `"*://*/*"`. Register `overlay.ts` at `document_idle`. Register popup.                                              |
| 1.7 | Create `service-worker.ts`   | Minimal — just listens for `chrome.action.onClicked` if no popup, or handles install event to set defaults.                                                                                                            |
| 1.8 | Settings change listener     | In `overlay.ts`, listen for `chrome.storage.onChanged` to update overlay in real time when user moves slider.                                                                                                          |

#### Acceptance Tests — Phase 1

- [ ] Open any bright page (e.g. `about:blank`, Google). Page loads with a brief dim overlay (anti-flash), then settles to the stored dim level.
- [ ] Open popup. Move dim slider to 0% → page is fully bright. Move to 40% → page is noticeably dimmed.
- [ ] Right-click, inspect overlay element → it has `pointer-events: none`. Clicking links and buttons on the page still works.
- [ ] Open DevTools Performance tab → no ongoing JS activity when idle. CPU ≈ 0%.
- [ ] Reload page → anti-flash overlay appears immediately (no white flash), then adjusts.
- [ ] Test in Chrome AND Firefox.

---

### Phase 2 — Warm Tint

**Goal:** Separate warmth slider adds an amber/sepia tint overlay.

#### Tasks

| #   | Task                             | Detail                                                                                                                                                                                                                                                      |
| --- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2.1 | Extend overlay to support warmth | Either a second overlay `<div>` with `background: rgba(255, 180, 60, <warmth>)` layered under the dim overlay, or a combined single element using CSS `background: linear-gradient(...)` or multiple box-shadows. Prefer two separate elements for clarity. |
| 2.2 | Add warmth slider to popup       | Independent slider, 0–40%. Saves `warmthLevel` to settings.                                                                                                                                                                                                 |
| 2.3 | Update `overlay.ts`              | Read `warmthLevel` and apply. Listen for storage changes.                                                                                                                                                                                                   |
| 2.4 | Update anti-flash                | Anti-flash only applies dim (not warmth) to keep the document_start script tiny.                                                                                                                                                                            |

#### Acceptance Tests — Phase 2

- [ ] Warmth at 0% → no tint. Warmth at 40% → visible warm amber overlay.
- [ ] Dim and warmth operate independently. Dim 20% + warmth 0% looks different from dim 0% + warmth 20%.
- [ ] Both sliders at max → page is dim and warm, still usable, all clicks work.
- [ ] Test on a page with dark theme (e.g. YouTube dark mode) → warmth is subtle but visible, dim doesn't make it unusable.
- [ ] Chrome + Firefox.

---

### Phase 3 — Day/Evening/Night Schedule

**Goal:** Dim and warmth levels change automatically based on time of day.

#### Tasks

| #   | Task                                               | Detail                                                                                                                      |
| --- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| 3.1 | Create `shared/schedule.ts`                        | `getCurrentPeriod(now: Date, schedule: ScheduleSettings): "day" \| "evening" \| "night"`. Pure function, easily testable.   |
| 3.2 | Integrate schedule into settings resolution        | `getEffectiveDim()` and `getEffectiveWarmth()` check if schedule is enabled → use period-specific values instead of global. |
| 3.3 | Background alarm for period transitions            | Use `chrome.alarms` to fire at the next period boundary. On alarm, send message to all content scripts to re-check overlay. |
| 3.4 | Options page — schedule section                    | Inputs for day/evening/night start times. Sliders for dim + warmth per period. Toggle to enable/disable schedule.           |
| 3.5 | Create `options.html`, `options.css`, `options.ts` | Full settings page. Link from popup ("More settings" link).                                                                 |
| 3.6 | Popup shows current period                         | Small label: "Day mode", "Evening mode", "Night mode" when schedule is active.                                              |

#### Acceptance Tests — Phase 3

- [ ] Enable schedule. Set day dim to 5%, evening to 15%, night to 25%. Change system clock (or adjust the period times to bracket current time) → overlay updates to match the period.
- [ ] Disable schedule → reverts to global dim/warmth sliders.
- [ ] Leave browser open across a period boundary → overlay updates automatically (alarm fires).
- [ ] Options page saves and loads correctly. Close and reopen → values persist.
- [ ] Popup displays current period label.
- [ ] Chrome + Firefox.

---

### Phase 4 — Per-Site Settings

**Goal:** Users can disable GlowGuard or set custom dim/warmth per website.

#### Tasks

| #   | Task                                  | Detail                                                                                                                               |
| --- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 4.1 | Create `shared/site-rules.ts`         | `matchSiteRule(hostname: string, rules: SiteRule[]): SiteRule \| null`. Simple hostname or `*.domain.com` glob matching.             |
| 4.2 | Integrate into settings resolution    | `getEffectiveDim()` checks site rules first → if match and has override, use it. If match and `enabled: false`, return 0 (disabled). |
| 4.3 | Popup: "Disable on this site" button  | Gets current tab URL, adds a `SiteRule` with `enabled: false`.                                                                       |
| 4.4 | Popup: per-site dim/warmth override   | When on a site with a rule, show the override sliders. "Use global" checkbox to clear override.                                      |
| 4.5 | Options page: site rules list         | Table of all rules. Add/edit/remove.                                                                                                 |
| 4.6 | Content script reads current hostname | On load, resolve effective settings for this specific site.                                                                          |

#### Acceptance Tests — Phase 4

- [ ] Open Google → default dim. Click "Disable on this site" → dim disappears on Google. Open Wikipedia → dim still active.
- [ ] Re-enable on Google → dim returns.
- [ ] Set per-site dim override on Google to 30% while global is 10%. Google shows 30%, other sites show 10%.
- [ ] Add a wildcard rule `*.example.com` → works on `sub.example.com`.
- [ ] Options page shows the rule list. Delete a rule → site reverts to global.
- [ ] Chrome + Firefox.

---

### Phase 5 — Bright-Page Boost

**Goal:** Automatically add extra dim on very bright pages.

#### Tasks

| #   | Task                          | Detail                                                                                                                                                                                                                                 |
| --- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 5.1 | Create `shared/brightness.ts` | `isPageBright(): boolean`. Check `document.documentElement.style.backgroundColor` and `document.body.style.backgroundColor` via `getComputedStyle`. If white or very light (luminance > 0.9), return true. Do NOT scan child elements. |
| 5.2 | Integrate into overlay        | On `document_idle` (after overlay.ts loads), call `isPageBright()`. If true and `brightBoost.enabled`, add `brightBoost.extraDim` to effective dim.                                                                                    |
| 5.3 | Add toggle in options         | Enable/disable bright boost. Slider for extra dim amount (5–10%).                                                                                                                                                                      |
| 5.4 | One-shot check                | Do NOT re-check continuously. Run once on page load. Optionally re-run on `visibilitychange` (tab becomes visible again).                                                                                                              |

#### Acceptance Tests — Phase 5

- [ ] Open a white-background page (Google, Wikipedia) → extra dim applied (visible difference vs. global dim alone).
- [ ] Open a dark-themed page (YouTube dark mode) → no extra dim.
- [ ] Disable bright boost in options → no extra dim on any page.
- [ ] Performance: no ongoing observers or intervals. One-shot check only.
- [ ] Chrome + Firefox.

---

### Phase 6 — Keyboard Shortcuts

**Goal:** Quick keyboard actions for power users.

#### Tasks

| #   | Task                                   | Detail                                                                                                                                                                            |
| --- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 6.1 | Keyboard shortcuts — manifest commands | Define in manifest: `_execute_action` (toggle), `toggle-glowguard`, `dim-increase`, `dim-decrease`, `disable-current-site`.                                                       |
| 6.2 | Background handles commands            | `chrome.commands.onCommand` listener. For toggle: flip `enabled`. For dim increase/decrease: adjust `dimLevel` by 5%. For disable site: get active tab URL, add/toggle site rule. |
| 6.3 | Add shortcuts section to options page  | Show current keybindings. Link to browser's built-in shortcut editor (`chrome://extensions/shortcuts`).                                                                           |

#### Acceptance Tests — Phase 6

- [ ] Keyboard shortcut toggles GlowGuard on/off. Page updates instantly.
- [ ] Keyboard shortcut increases dim → visible change. Decrease → visible change.
- [ ] Keyboard shortcut disables on current site → overlay removed on this tab.
- [ ] Chrome + Firefox (note: Firefox shortcut registration may differ slightly).

---

### Phase 7 — Polish, Edge Cases & Cross-Browser QA

**Goal:** Production-ready quality. Handle all edge cases.

#### Tasks

| #    | Task                                         | Detail                                                                                                                                                                                                                                                                                                                                                                                                   |
| ---- | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 7.1  | Handle iframes                               | Overlay should cover iframes too. Since content scripts run in each frame by default (`"all_frames": true`), the overlay is injected per-frame. Ensure no doubled dimming — use `if (window === window.top)` for the main overlay, and per-frame for iframes, OR only overlay in the top frame and rely on it covering iframes via z-index + position:fixed. Test both approaches, pick the simpler one. |
| 7.2  | Handle `about:blank`, `chrome://`, `edge://` | Content scripts can't run on privileged pages. Gracefully degrade — popup shows "Cannot dim this page".                                                                                                                                                                                                                                                                                                  |
| 7.3  | Handle PDF viewer                            | Chrome's built-in PDF viewer is an embed. Test that overlay still works.                                                                                                                                                                                                                                                                                                                                 |
| 7.4  | Handle fullscreen video                      | When a video goes fullscreen, the overlay may cover it. Detect fullscreen via `document.fullscreenElement` and hide/reduce overlay.                                                                                                                                                                                                                                                                      |
| 7.5  | Popup responsiveness                         | Test popup at different DPI scales. Ensure sliders are usable.                                                                                                                                                                                                                                                                                                                                           |
| 7.6  | Options page responsiveness                  | Clean layout. Test at narrow widths.                                                                                                                                                                                                                                                                                                                                                                     |
| 7.7  | Storage migration                            | Add a `settingsVersion` field. If future versions change the schema, migrate on load.                                                                                                                                                                                                                                                                                                                    |
| 7.8  | Error handling                               | Wrap all storage operations in try/catch. If storage fails, fall back to defaults.                                                                                                                                                                                                                                                                                                                       |
| 7.9  | Accessibility                                | Popup and options page should be keyboard-navigable. Sliders should have ARIA labels.                                                                                                                                                                                                                                                                                                                    |
| 7.10 | Icon states                                  | Dim the toolbar icon when GlowGuard is disabled or disabled on the current site. Use `chrome.action.setIcon()` with a greyed-out variant.                                                                                                                                                                                                                                                                |
| 7.11 | Firefox differences                          | Test `browser.` vs `chrome.` namespace. Ensure `web-ext lint` passes.                                                                                                                                                                                                                                                                                                                                    |

#### Acceptance Tests — Phase 7

- [ ] Open a page with iframes (e.g. embedded YouTube) → iframe content is also dimmed, not double-dimmed.
- [ ] Open `chrome://settings` → popup says "Cannot dim this page", no errors in console.
- [ ] Open a PDF → overlay works over the PDF content.
- [ ] Enter fullscreen video → overlay hides or reduces so video is watchable.
- [ ] All popup controls are keyboard-accessible (Tab through them).
- [ ] Toolbar icon reflects enabled/disabled state.
- [ ] `web-ext lint` on the Firefox build → no errors, no warnings.
- [ ] Full manual test on Chrome, Edge, and Firefox.

---

### Phase 8 — Build, Package & Publish

**Goal:** Publish to all three stores.

#### Tasks

| #   | Task                        | Detail                                                                                                  |
| --- | --------------------------- | ------------------------------------------------------------------------------------------------------- |
| 8.1 | Final icon design           | Professional 128×128 icon + 16/32/48 variants.                                                          |
| 8.2 | Write store descriptions    | Short description, feature list, screenshots.                                                           |
| 8.3 | Create screenshots          | Popup open, options page, before/after comparison.                                                      |
| 8.4 | Build release ZIPs          | `npm run package` → `glowguard-chrome-v1.0.0.zip`, `glowguard-firefox-v1.0.0.zip`.                      |
| 8.5 | Chrome Web Store submission | Developer account ($5 one-time fee). Upload ZIP. Fill in listing.                                       |
| 8.6 | Edge Add-ons submission     | Microsoft Partner Center account (free). Upload same Chrome ZIP (Edge accepts Chrome extensions).       |
| 8.7 | Firefox AMO submission      | AMO developer account (free). Upload Firefox ZIP. AMO requires source code upload if build step exists. |
| 8.8 | Review & iterate            | Respond to any store review feedback.                                                                   |

---

## Browser Compatibility Notes

### Manifest Differences

| Feature                 | Chrome/Edge                                 | Firefox                                                                                    |
| ----------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Manifest version        | `3`                                         | `3` (supported since Firefox 109)                                                          |
| Service worker          | `"background": { "service_worker": "..." }` | `"background": { "scripts": ["..."] }` (Firefox MV3 uses event pages, not service workers) |
| Browser namespace       | `chrome.*`                                  | `browser.*` (also supports `chrome.*` but `browser.*` returns Promises)                    |
| Extension ID            | Assigned by store                           | Must declare `browser_specific_settings.gecko.id`                                          |
| Host permissions        | `"host_permissions": ["<all_urls>"]`        | Same, but AMO reviews more strictly                                                        |
| `content_scripts.world` | `"MAIN"` or `"ISOLATED"` supported          | `"ISOLATED"` only (no `"MAIN"` world)                                                      |

### API Compatibility

| API                    | Chrome | Firefox                       | Notes                         |
| ---------------------- | ------ | ----------------------------- | ----------------------------- |
| `chrome.storage.local` | Yes    | Yes (`browser.storage.local`) | Use promise-based API on both |
| `chrome.alarms`        | Yes    | Yes                           |                               |
| `chrome.commands`      | Yes    | Yes                           | Max 4 shortcuts on Firefox    |
| `chrome.action`        | Yes    | Yes (`browser.action`)        |                               |
| `chrome.tabs.query`    | Yes    | Yes                           |                               |
| `chrome.scripting`     | Yes    | Yes                           |                               |

### Cross-Browser Wrapper Strategy

Use a thin polyfill at the top of shared modules:

```typescript
const api = (
  typeof browser !== 'undefined' ? browser : chrome
) as typeof chrome;
```

Or use Mozilla's `webextension-polyfill` (small, well-tested). Evaluate at Phase 0 whether the polyfill is needed or if the thin wrapper suffices.

---

## Performance Checklist

Run through this checklist at the end of every phase.

| #   | Check                     | Target                                 | How to Verify                                                                   |
| --- | ------------------------- | -------------------------------------- | ------------------------------------------------------------------------------- |
| 1   | Idle CPU usage            | 0%                                     | DevTools → Performance → Record 10s on idle page. No JS activity.               |
| 2   | Content script size       | < 5 KB (anti-flash), < 20 KB (overlay) | Check `dist/` file sizes after build.                                           |
| 3   | Overlay element count     | 1–2 elements injected                  | DevTools → Elements → search for GlowGuard overlay.                             |
| 4   | No MutationObserver       | None in content scripts                | Grep source for `MutationObserver`. Should find zero.                           |
| 5   | No querySelectorAll("\*") | Never                                  | Grep source. Should find zero.                                                  |
| 6   | No interval timers        | None in content scripts                | Grep for `setInterval`. Should find zero in content scripts.                    |
| 7   | Memory usage              | < 2 MB per tab                         | Chrome Task Manager (`Shift+Esc`) → check extension memory per tab.             |
| 8   | Page load impact          | < 5 ms added                           | DevTools → Performance → measure `DOMContentLoaded` with and without extension. |
| 9   | Anti-flash timing         | Overlay visible before first paint     | Slow down network in DevTools → reload → no white flash.                        |
| 10  | No network requests       | Zero                                   | DevTools → Network → filter by extension origin. Must be empty.                 |

---

## Publishing Checklist

### Before Submission

- [ ] All Phase 7 acceptance tests pass on Chrome, Edge, and Firefox.
- [ ] `npm run build` produces clean output with no warnings.
- [ ] `web-ext lint` passes on Firefox build.
- [ ] All permissions in manifest are justified and minimal.
- [ ] Privacy policy written (even if simple: "GlowGuard collects no data").
- [ ] Store listing description written.
- [ ] Screenshots captured (popup, options page, before/after).
- [ ] Icon finalized in all required sizes.
- [ ] Version number set to `1.0.0` in manifests and `package.json`.
- [ ] No `console.log` statements left in production code.
- [ ] Source code is clean and commented where necessary.
- [ ] LICENSE file added (MIT recommended for open-source, or proprietary).

### Chrome Web Store

- [ ] Developer account created and verified ($5 fee).
- [ ] ZIP uploaded (max 20 MB, but ours should be < 100 KB).
- [ ] Category: "Accessibility" or "Productivity".
- [ ] Single purpose description filled in.
- [ ] Justification for `<all_urls>` permission written.

### Edge Add-ons

- [ ] Partner Center account created.
- [ ] Chrome ZIP uploaded (Edge accepts Chrome MV3 extensions directly).
- [ ] Listing details filled in.

### Firefox AMO

- [ ] Developer account created.
- [ ] Firefox ZIP uploaded.
- [ ] Source code ZIP uploaded (required since we have a build step).
- [ ] Build instructions included with source code.
- [ ] `browser_specific_settings.gecko.id` is set.

---

## Summary & Phase Order

| Phase | Focus                  | Key Deliverable                   |
| ----- | ---------------------- | --------------------------------- |
| **0** | Scaffolding            | Empty extension loads in browsers |
| **1** | Anti-flash + dimming   | Pages dim, slider works           |
| **2** | Warm tint              | Separate warmth overlay           |
| **3** | Schedule               | Auto dim/warmth by time of day    |
| **4** | Per-site settings      | Disable/override per website      |
| **5** | Bright-page boost      | Extra dim on white pages          |
| **6** | Keyboard shortcuts     | Power user features               |
| **7** | Polish + QA            | Production quality                |
| **8** | Package + publish      | Live on all three stores          |

Each phase builds on the previous. Do not skip ahead. Test after every phase.
