<p align="center">
  <img src="icons/icon-128.png" alt="GlowGuard" width="96">
</p>

<h1 align="center">GlowGuard</h1>

<p align="center">A lightweight page dimmer for Chrome, Edge, and Firefox.</p>

---

## Why GlowGuard?

Most websites blast your eyes with pure bright/white backgrounds. Dark mode extensions do fix this but then they often break page layouts, slow things down, or make sites look weird.

GlowGuard takes a different approach: instead of rewriting colors, it places a thin overlay on top of the page. Simple, fast, and it never breaks anything.

---

## Features

### Dimming

A lightweight overlay that darkens any page. Adjustable from barely-there to noticeably dimmed. Works on every website instantly.

### Blue Light Filter

Reduces blue light with an amber tint. Choose from four presets — Off, Soft, Warm, and Deep — each carefully tuned to look natural.

### Automatic Mode

One toggle. GlowGuard figures out the rest:

- **Day** (6am–6pm) — light dim, no filter
- **Evening** (6pm–10pm) — medium dim, soft blue light filter
- **Night** (10pm–6am) — stronger dim, warm blue light filter
- **Bright pages** get extra dimming automatically

### Anti-Flash Protection

Ever notice the blinding white flash before a page loads? GlowGuard injects a dim overlay at `document_start` — before the page even renders — so you never get flashed.

### Keyboard Shortcuts

- `Alt+Shift+G` — Toggle GlowGuard on/off
- `Alt+Shift+Up` — Increase dim
- `Alt+Shift+Down` — Decrease dim
- `Alt+Shift+W` — Cycle blue light filter (Off → Soft → Warm → Deep)

---

## Performance

GlowGuard is designed to use zero resources when idle:

- **No DOM scanning** — doesn't touch page elements
- **No MutationObservers** — doesn't watch for changes
- **No network requests** — everything runs locally
- **No frameworks** — plain HTML/CSS/JS
- **1–2 overlay divs** — that's the entire footprint
- **Idle CPU: 0%**

---

## Privacy

- No analytics
- No tracking
- No external network calls
- No account system
- All settings stored locally in your browser

---

## Installation

### From Source (Development)

```bash
git clone https://github.com/AcidYurets/GlowGuard.git
cd GlowGuard
npm install
npm run build
```

**Chrome / Edge:**

1. Open `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `dist/chrome/` folder

**Firefox:**

1. Open `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on..."
3. Select `dist/firefox/manifest.json`

### From Store _(coming soon)_

- Chrome Web Store
- Edge Add-ons
- Firefox Add-ons (AMO)

---

## Tech Stack

- **TypeScript** — type-safe source code
- **esbuild** — fast bundler
- **Manifest V3** — modern extension API
- **Plain HTML/CSS** — no frameworks in the UI

---

## Project Structure

```
src/
├── background/     Service worker (shortcuts, alarms, install)
├── content/        Scripts injected into web pages (overlay)
├── popup/          Toolbar popup UI
├── shared/         Settings, schedule, brightness detection
└── types/          TypeScript interfaces
```

---

## License

MIT
